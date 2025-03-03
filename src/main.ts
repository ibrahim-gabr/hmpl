"use strict";
import JSON5 from "json5";

import {
  HMPLNodeObj,
  HMPLRenderFunction,
  HMPLRequest,
  HMPLRequestFunction,
  HMPLRequestInit,
  HMPLInstance,
  HMPLIdentificationRequestInit,
  HMPLCompile,
  HMPLTemplateFunction,
  HMPLData,
  HMPLElement,
  HMPLRequestsObject,
  HMPLRequestInfo,
  HMPLIndicator,
  HMPLIndicatorTrigger,
  HMPLParsedIndicators,
  HMPLRequestStatus,
  HMPLCompileOptions,
  HMPLRequestInitFunction,
  HMPLRequestContext,
  HMPLInstanceContext,
  HMPLAutoBodyOptions
} from "./types";

/**
 * Checks if the provided value is an object (excluding arrays and null).
 * @param val - The value to check.
 * @returns True if val is an object, false otherwise.
 */
const checkObject = (val: any) => {
  return typeof val === "object" && !Array.isArray(val) && val !== null;
};

/**
 * Checks if the provided value is a function.
 * @param val - The value to check.
 * @returns True if val is a function, false otherwise.
 */
const checkFunction = (val: any) => {
  return Object.prototype.toString.call(val) === "[object Function]";
};

/**
 * Throws a new error with the provided message.
 * @param text - The error message.
 */
const createError = (text: string) => {
  throw new Error(text);
};

/**
 * Logs a warning message to the console.
 * @param text - The warning message.
 */
const createWarning = (text: string) => {
  console.warn(text);
};

/**
 * Validates the HTTP method.
 * @param method - The HTTP method to validate.
 * @returns False if the method is valid, true otherwise.
 */
const getIsMethodValid = (method: string) => {
  return (
    method !== "get" &&
    method !== "post" &&
    method !== "put" &&
    method !== "delete" &&
    method !== "patch"
  );
};

/**
 * Constants representing various property names and error messages.
 */
const SOURCE = `src`;
const METHOD = `method`;
const ID = `initId`;
const AFTER = `after`;
const MODE = `repeat`;
const MEMO = `memo`;
const INDICATORS = `indicators`;
const AUTO_BODY = `autoBody`;
const COMMENT = `hmpl`;
const FORM_DATA = `formData`;
const RESPONSE_ERROR = `Bad response`;
const REQUEST_INIT_ERROR = `RequestInit error`;
const RENDER_ERROR = `Render error`;
const REQUEST_OBJECT_ERROR = `Request Object error`;
const PARSE_ERROR = `Parse error`;
const COMPILE_ERROR = `Compile error`;
const DEFAULT_AUTO_BODY = {
  formData: true
};
const DEFAULT_FALSE_AUTO_BODY = {
  formData: false
};
const MAIN_REGEX = /(\{\{(?:.|\n|\r)*?\}\}|\{\s*\{(?:.|\n|\r)*?\}\s*\})/g;
const BRACKET_REGEX = /([{}])|([^{}]+)/g;

/**
 * List of request options that are allowed.
 */
const requestOptions = [
  SOURCE,
  METHOD,
  ID,
  AFTER,
  MODE,
  INDICATORS,
  MEMO,
  AUTO_BODY
];

/**
 * HTTP status codes without successful responses.
 */
const codes = [
  100, 101, 102, 103, 300, 301, 302, 303, 304, 305, 306, 307, 308, 400, 401,
  402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416,
  417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451, 500, 501, 502,
  503, 504, 505, 506, 507, 508, 510, 511
];

/**
 * Parses a string into a HTML template element.
 * @param str - The string to parse.
 * @returns The first child node of the parsed template.
 */
const getTemplateWrapper = (str: string) => {
  const elementDocument = new DOMParser().parseFromString(
    `<template>${str}</template>`,
    "text/html"
  );
  const elWrapper = elementDocument.childNodes[0].childNodes[0].firstChild;
  return elWrapper;
};

/**
 * Parses the response string into DOM elements, excluding scripts.
 * @param response - The response string to parse.
 * @returns The parsed template wrapper.
 */
const getResponseElements = (response: string) => {
  const typeResponse = typeof response;
  if (typeResponse !== "string")
    createError(
      `${RESPONSE_ERROR}: Expected type string, but received type ${typeResponse}`
    );
  const elWrapper = getTemplateWrapper(response);
  const elContent = elWrapper!["content"];
  const scripts = elContent.querySelectorAll("script");
  for (let i = 0; i < scripts.length; i++) {
    const currentScript = scripts[i];
    elContent.removeChild(currentScript);
  }
  return elWrapper;
};

/**
 * Makes an HTTP request and handles the response.
 * @param el - The element related to the request.
 * @param mainEl - The main element in the DOM.
 * @param dataObj - The node object containing data.
 * @param method - The HTTP method to use.
 * @param source - The source URL for the request.
 * @param isRequest - Indicates if it's a single request.
 * @param isRequests - Indicates if it's multiple requests.
 * @param isMemo - Indicates if memoization is enabled.
 * @param options - The request initialization options.
 * @param templateObject - The template instance.
 * @param reqObject - The request object.
 * @param indicators - Parsed indicators for the request.
 */
const makeRequest = (
  el: undefined | Element,
  mainEl: undefined | Element,
  dataObj: HMPLNodeObj | undefined,
  method: string,
  source: string,
  isRequest: boolean,
  isRequests: boolean,
  isMemo: boolean,
  options: HMPLRequestInit = {},
  templateObject: HMPLInstance,
  reqObject?: HMPLRequest,
  indicators?: HMPLParsedIndicators
) => {
  const {
    mode,
    cache,
    redirect,
    get,
    referrerPolicy,
    signal,
    credentials,
    timeout,
    referrer,
    headers,
    body,
    window: windowOption,
    integrity
  } = options;

  const initRequest: RequestInit = {
    method: method.toUpperCase()
  };

  // Assign optional properties if they are provided
  if (credentials !== undefined) {
    initRequest.credentials = credentials;
  }
  if (body !== undefined) {
    initRequest.body = body;
  }
  if (mode !== undefined) {
    initRequest.mode = mode;
  }
  if (cache !== undefined) {
    initRequest.cache = cache;
  }
  if (redirect !== undefined) {
    initRequest.redirect = redirect;
  }
  if (referrerPolicy !== undefined) {
    initRequest.referrerPolicy = referrerPolicy;
  }
  if (integrity !== undefined) {
    initRequest.integrity = integrity;
  }
  if (referrer !== undefined) {
    initRequest.referrer = referrer;
  }

  const isHaveSignal = signal !== undefined;
  if (isHaveSignal) {
    initRequest.signal = signal;
  }
  if (windowOption !== undefined) {
    initRequest.window = windowOption;
  }
  if ((options as any).keepalive !== undefined) {
    createWarning(
      `${REQUEST_INIT_ERROR}: The "keepalive" property is not yet supported`
    );
  }

  // Handle headers if provided
  if (headers) {
    if (checkObject(headers)) {
      const newHeaders = new Headers();
      for (const key in headers) {
        const value = headers[key];
        const valueType = typeof value;
        if (valueType === "string") {
          try {
            newHeaders.set(key, value);
          } catch (e) {
            throw e;
          }
        } else {
          createError(
            `${REQUEST_INIT_ERROR}: Expected type string, but received type ${valueType}`
          );
        }
      }
      initRequest.headers = newHeaders;
    } else {
      createError(
        `${REQUEST_INIT_ERROR}: The "headers" property must contain a value object`
      );
    }
  }

  // Handle timeout and signal
  if (timeout) {
    if (!isHaveSignal) {
      initRequest.signal = AbortSignal.timeout(timeout);
    } else {
      createWarning(
        `${REQUEST_INIT_ERROR}: The "signal" property overwrote the AbortSignal from "timeout"`
      );
    }
  }

  const isRequestMemo = isMemo && !isRequest && dataObj?.memo;
  const getIsNotFullfilledStatus = (status: string | number) =>
    status === "rejected" ||
    (typeof status === "number" && (status < 200 || status > 299));

  /**
   * Calls the 'get' function with the response if provided.
   * @param reqResponse - The response to pass to the 'get' function.
   */
  const callGetResponse = (
    reqResponse: Element | ChildNode[] | null | undefined
  ) => {
    if (isRequests) {
      reqObject!.response = reqResponse;
      get?.("response", reqResponse, reqObject);
    }
    get?.("response", mainEl);
  };

  /**
   * Updates the DOM nodes with new content.
   * @param content - The content to insert.
   * @param isClone - Whether to clone the content.
   * @param isNodes - Whether to update nodes in dataObj.
   */
  const updateNodes = (
    content: HTMLTemplateElement,
    isClone: boolean = true,
    isNodes: boolean = false
  ) => {
    if (isRequest) {
      (templateObject.response as any) = content!.cloneNode(true);
      get?.("response", content);
    } else {
      let reqResponse: ChildNode[] = [];
      const newContent = isClone ? content!.cloneNode(true) : content;
      const nodes = (newContent as HTMLTemplateElement).content.childNodes;
      if (dataObj!.nodes) {
        const parentNode = dataObj!.parentNode! as ParentNode;
        if (!parentNode) createError(`${RENDER_ERROR}: ParentNode is null`);
        const newNodes: ChildNode[] = [];
        const nodesLength = dataObj!.nodes.length;
        for (let i = 0; i < nodesLength; i++) {
          const node = dataObj!.nodes[i];
          if (i === nodesLength - 1) {
            for (let j = 0; j < nodes.length; j++) {
              const reqNode = nodes[j];
              const newNode = parentNode.insertBefore(reqNode, node);
              newNodes.push(newNode);
            }
          }
          parentNode.removeChild(node);
        }
        reqResponse = newNodes.slice();
        dataObj!.nodes = newNodes;
      } else {
        const parentNode = el!.parentNode as ParentNode;
        const newNodes: ChildNode[] = [];
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const newNode = parentNode.insertBefore(node, el!);
          newNodes.push(newNode);
        }
        parentNode.removeChild(el!);
        reqResponse = newNodes.slice();
        dataObj!.nodes = newNodes;
        dataObj!.parentNode = parentNode;
      }
      if (isRequestMemo && isNodes) {
        dataObj!.memo!.nodes = dataObj!.nodes;
        if (dataObj!.memo!.isPending) dataObj!.memo!.isPending = false;
      }
      callGetResponse(reqResponse);
    }
  };

  let isOverlap = false;
  let isNotHTMLResponse = false;

  /**
   * Replaces nodes with a comment node.
   */
  const setComment = () => {
    if (isRequest) {
      templateObject.response = undefined;
      get?.("response", undefined);
    } else {
      if (dataObj!.nodes) {
        const parentNode = dataObj!.parentNode! as ParentNode;
        if (!parentNode) createError(`${RENDER_ERROR}: ParentNode is null`);
        const nodesLength = dataObj!.nodes.length;
        for (let i = 0; i < nodesLength; i++) {
          const node = dataObj!.nodes[i];
          if (i === nodesLength - 1) {
            parentNode.insertBefore(dataObj!.comment, node);
          }
          parentNode.removeChild(node);
        }
        dataObj!.nodes = null;
        dataObj!.parentNode = null;
        if (isRequests) {
          reqObject!.response = undefined;
          get?.("response", undefined, reqObject);
        }
        get?.("response", mainEl);
      }
    }
    if (isRequestMemo) {
      if (dataObj!.memo!.response !== null) {
        dataObj!.memo!.response = null;
        delete dataObj!.memo!.isPending;
        delete dataObj!.memo!.nodes;
      }
    }
  };

  /**
   * Updates the indicator based on the request status.
   * @param status - The current request status.
   */
  const updateIndicator = (status: HMPLRequestStatus) => {
    if (indicators) {
      if (
        isRequestMemo &&
        status !== "pending" &&
        getIsNotFullfilledStatus(status)
      ) {
        if (dataObj!.memo!.isPending) dataObj!.memo!.isPending = false;
      }
      if (status === "pending") {
        const content = indicators["pending"];
        if (content !== undefined) {
          if (isRequestMemo) {
            dataObj!.memo!.isPending = true;
          }
          updateNodes(content);
        }
      } else if (status === "rejected") {
        const content = indicators["rejected"];
        if (content !== undefined) {
          updateNodes(content);
        } else {
          const errorContent = indicators["error"];
          if (errorContent !== undefined) {
            updateNodes(errorContent);
          } else {
            setComment();
          }
        }
      } else {
        const content = indicators[`${status}`];
        if (status > 399) {
          isOverlap = true;
          if (content !== undefined) {
            updateNodes(content);
          } else {
            const errorContent = indicators["error"];
            if (errorContent !== undefined) {
              updateNodes(errorContent);
            } else {
              setComment();
            }
          }
        } else {
          if (status < 200 || status > 299) {
            isNotHTMLResponse = true;
            if (content !== undefined) {
              updateNodes(content);
            } else {
              setComment();
            }
          }
        }
      }
    }
  };

  /**
   * Updates the status and handles dependencies.
   * @param status - The new request status.
   */
  const updateStatusDepenencies = (status: HMPLRequestStatus) => {
    if (isRequests) {
      if (reqObject!.status !== status) {
        reqObject!.status = status;
        get?.("status", status, reqObject);
      }
    } else {
      if (templateObject.status !== status) {
        templateObject.status = status;
        get?.("status", status);
      }
    }
    if (isRequestMemo && getIsNotFullfilledStatus(status)) {
      dataObj!.memo!.response = null;
      delete dataObj!.memo!.nodes;
    }
    updateIndicator(status);
  };

  /**
   * Uses cached nodes if available.
   */
  const takeNodesFromCache = () => {
    if (dataObj!.memo!.isPending) {
      const parentNode = dataObj!.parentNode! as ParentNode;
      if (!parentNode) createError(`${RENDER_ERROR}: ParentNode is null`);
      const memoNodes = dataObj!.memo!.nodes!;
      const currentNodes = dataObj!.nodes!;
      const nodesLength = currentNodes!.length;
      const newNodes: ChildNode[] = [];
      for (let i = 0; i < nodesLength; i++) {
        const node = currentNodes[i];
        if (i === nodesLength - 1) {
          for (let j = 0; j < memoNodes.length; j++) {
            const reqNode = memoNodes[j];
            const newNode = parentNode.insertBefore(reqNode, node);
            newNodes.push(newNode);
          }
        }
        parentNode.removeChild(node);
      }
      dataObj!.nodes = newNodes.slice();
      dataObj!.memo!.isPending = false;
      dataObj!.memo!.nodes = newNodes.slice();
    }
    const reqResponse = dataObj!.nodes!.slice();
    callGetResponse(reqResponse);
  };

  let requestStatus: HMPLRequestStatus = 200;
  updateStatusDepenencies("pending");

  // Perform the fetch request
  fetch(source, initRequest)
    .then((response) => {
      requestStatus = response.status as HMPLRequestStatus;
      updateStatusDepenencies(requestStatus);
      if (!response.ok) {
        createError(
          `${RESPONSE_ERROR}: Response with status code ${requestStatus}`
        );
      }
      return response.text();
    })
    .then((data) => {
      if (!isNotHTMLResponse) {
        if (!getIsNotFullfilledStatus(requestStatus)) {
          if (isRequestMemo) {
            const { response } = dataObj.memo!;
            if (response === null) {
              dataObj.memo!.response = data;
            } else {
              if (response === data) {
                takeNodesFromCache();
                return;
              } else {
                dataObj.memo!.response = data;
                delete dataObj.memo!.nodes;
              }
            }
          }
          const templateWrapper = getResponseElements(data);
          if (isRequest) {
            (templateObject.response as any) = templateWrapper;
            get?.("response", templateWrapper);
          } else {
            const reqResponse: ChildNode[] = [];
            const nodes = (templateWrapper as HTMLTemplateElement).content
              .childNodes;
            if (dataObj) {
              updateNodes(templateWrapper as HTMLTemplateElement, false, true);
            } else {
              const parentNode = el!.parentNode as ParentNode;
              for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const reqNode = parentNode.insertBefore(node, el!);
                if (isRequests) {
                  reqResponse.push(reqNode);
                }
              }
              parentNode.removeChild(el!);
              if (isRequests) {
                reqObject!.response = reqResponse;
                get?.("response", reqResponse, reqObject);
              }
              get?.("response", mainEl);
            }
          }
        } else {
          setComment();
        }
      }
    })
    .catch((error) => {
      if (!isOverlap) {
        updateStatusDepenencies("rejected");
        if (!indicators) {
          setComment();
        }
      }
      throw error;
    });
};

/**
 * Executes a HMPLRequestInitFunction to obtain request initialization options.
 * @param fn - The function to execute.
 * @param event - The event object (if any).
 * @returns The HMPLRequestInit object.
 */
const getRequestInitFromFn = (
  fn: HMPLRequestInitFunction,
  event?: Event
): HMPLRequestInit | undefined => {
  const request: HMPLRequestContext = {};
  if (event !== undefined) {
    request.event = event;
  }
  const context: HMPLInstanceContext = {
    request
  };

  const result = fn(context);
  return result;
};

/**
 * Renders the template by processing requests and applying options.
 * @param currentEl - The current element or comment node.
 * @param fn - The render function.
 * @param requests - Array of request objects.
 * @param compileOptions - Options provided during compilation.
 * @param isMemoUndefined - Indicates if memoization is undefined.
 * @param isAutoBodyUndefined - Indicates if autoBody is undefined.
 * @param isRequest - Indicates if it's a single request.
 * @returns The rendered template function.
 */
const renderTemplate = (
  currentEl: Element | Comment,
  fn: HMPLRenderFunction,
  requests: HMPLRequestsObject[],
  compileOptions: HMPLCompileOptions,
  isMemoUndefined: boolean,
  isAutoBodyUndefined: boolean,
  isRequest: boolean = false
) => {
  const renderRequest = (req: HMPLRequestsObject, mainEl?: Element) => {
    const source = req.src;
    if (source) {
      const method = (req.method || "GET").toLowerCase();
      if (getIsMethodValid(method)) {
        createError(
          `${REQUEST_OBJECT_ERROR}: The "${METHOD}" property has only GET, POST, PUT, PATCH or DELETE values`
        );
      } else {
        const after = req.after;
        if (after && isRequest)
          createError(`${RENDER_ERROR}: EventTarget is undefined`);
        const isModeUndefined = !req.hasOwnProperty(MODE);
        if (!isModeUndefined && typeof req.repeat !== "boolean") {
          createError(
            `${REQUEST_OBJECT_ERROR}: The "${MODE}" property has only boolean value`
          );
        }
        const oldMode = isModeUndefined ? true : req.repeat;
        const modeAttr = oldMode ? "all" : "one";
        const isAll = modeAttr === "all";
        const isReqMemoUndefined = !req.hasOwnProperty(MEMO);
        let isMemo = isMemoUndefined ? false : compileOptions.memo;
        if (!isReqMemoUndefined) {
          if (after) {
            if (req.memo) {
              if (!isAll) {
                createError(
                  `${REQUEST_OBJECT_ERROR}: Memoization works in the enabled repetition mode`
                );
              } else {
                isMemo = true;
              }
            } else {
              isMemo = false;
            }
          } else {
            createError(
              `${REQUEST_OBJECT_ERROR}: Memoization works in the enabled repetition mode`
            );
          }
        } else {
          if (isMemo) {
            if (after) {
              if (!isAll) {
                isMemo = false;
              }
            } else {
              isMemo = false;
            }
          }
        }
        const isReqAutoBodyUndefined = !req.hasOwnProperty(AUTO_BODY);
        let autoBody = isAutoBodyUndefined ? false : compileOptions.autoBody!;
        if (!isReqAutoBodyUndefined) {
          if (after) {
            let reqAutoBody = req[AUTO_BODY];
            validAutoBody(reqAutoBody!);
            if (autoBody === true) {
              autoBody = DEFAULT_AUTO_BODY;
            }
            if (reqAutoBody === true) {
              reqAutoBody = DEFAULT_AUTO_BODY;
            }
            if (reqAutoBody === false) {
              autoBody = false;
            } else {
              const newAutoBody: HMPLAutoBodyOptions | undefined = {
                ...(autoBody === false ? DEFAULT_FALSE_AUTO_BODY : autoBody),
                ...reqAutoBody
              };
              autoBody = newAutoBody!;
            }
          } else {
            autoBody = false;
            createError(
              `${REQUEST_OBJECT_ERROR}: The "${AUTO_BODY}" property does not work without the "${AFTER}" property`
            );
          }
        } else {
          if (autoBody === true) {
            autoBody = DEFAULT_AUTO_BODY;
          }
          if (!after) {
            autoBody = false;
          }
        }
        const initId = req.initId;
        const nodeId = req.nodeId;
        let indicators: any = req.indicators;
        if (indicators) {
          const parseIndicator = (val: HMPLIndicator) => {
            const { trigger, content } = val;
            if (!trigger)
              createError(
                `${REQUEST_OBJECT_ERROR}: Failed to activate or detect the indicator`
              );
            if (!content)
              createError(
                `${REQUEST_OBJECT_ERROR}: Failed to activate or detect the indicator`
              );
            if (
              codes.indexOf(trigger as number) === -1 &&
              trigger !== "pending" &&
              trigger !== "rejected" &&
              trigger !== "error"
            ) {
              createError(
                `${REQUEST_OBJECT_ERROR}: Failed to activate or detect the indicator`
              );
            }
            const elWrapper = getTemplateWrapper(
              content
            ) as HTMLTemplateElement;
            return {
              ...val,
              content: elWrapper
            };
          };
          const newOn: any = {};
          const uniqueTriggers: HMPLIndicatorTrigger[] = [];
          for (let i = 0; i < indicators.length; i++) {
            const currentIndicator = parseIndicator(indicators[i]);
            const { trigger } = currentIndicator;
            if (uniqueTriggers.indexOf(trigger) === -1) {
              uniqueTriggers.push(trigger);
            } else {
              createError(
                `${REQUEST_OBJECT_ERROR}: Indicator trigger must be unique`
              );
            }
            newOn[`${trigger}`] = currentIndicator.content;
          }
          indicators = newOn;
        }
        const getOptions = (
          options:
            | HMPLRequestInitFunction
            | HMPLRequestInit
            | HMPLIdentificationRequestInit[],
          isArray: boolean = false
        ): HMPLRequestInit | HMPLRequestInitFunction => {
          if (isArray) {
            if (initId) {
              let result: HMPLRequestInit | HMPLRequestInitFunction | undefined;
              for (
                let i = 0;
                i < (options as HMPLIdentificationRequestInit[]).length;
                i++
              ) {
                const currentOptions = options[
                  i
                ] as HMPLIdentificationRequestInit;
                if (currentOptions.id === initId) {
                  result = currentOptions.value;
                  break;
                }
              }
              if (!result) {
                createError(
                  `${REQUEST_OBJECT_ERROR}: ID referenced by request not found`
                );
              }
              return result as HMPLRequestInit;
            } else {
              return {};
            }
          } else {
            if (initId)
              createError(
                `${REQUEST_OBJECT_ERROR}: ID referenced by request not found`
              );
            return options as HMPLRequestInit;
          }
        };
        const isDataObj = isAll && after;
        const reqFunction: HMPLRequestFunction = (
          reqEl,
          options,
          templateObject,
          data,
          reqMainEl,
          isArray = false,
          reqObject,
          isRequests = false,
          currentHMPLElement,
          event
        ) => {
          const id = data.currentId;
          if (isRequest) {
            if (!reqEl) reqEl = mainEl!;
          } else {
            if (!reqEl) {
              if (currentHMPLElement) {
                reqEl = currentHMPLElement.el;
              } else {
                let currentEl: Element | undefined;
                const { els } = data;
                for (let i = 0; i < els.length; i++) {
                  const e = els[i];
                  if (e.id === nodeId) {
                    currentHMPLElement = e;
                    currentEl = e.el;
                    break;
                  }
                }
                if (!currentEl) {
                  createError(
                    `${RENDER_ERROR}: The specified DOM element is not valid or cannot be found`
                  );
                }
                reqEl = currentEl!;
              }
            }
          }
          let dataObj: HMPLNodeObj;
          if (!isRequest) {
            if (isDataObj || indicators) {
              if (!currentHMPLElement)
                createError(
                  `${RENDER_ERROR}: The specified DOM element is not valid or cannot be found`
                );
              dataObj = currentHMPLElement!.objNode!;
              if (!dataObj!) {
                dataObj = {
                  id,
                  nodes: null,
                  parentNode: null,
                  comment: reqEl as unknown as Comment
                };
                if (isMemo) {
                  dataObj.memo = {
                    response: null
                  };
                  if (indicators) {
                    dataObj.memo.isPending = false;
                  }
                }
                currentHMPLElement!.objNode = dataObj;
                data.dataObjects.push(dataObj);
                data.currentId++;
              }
            }
          }
          let currentOptions = getOptions(options, isArray);
          const isOptionsFunction = checkFunction(currentOptions);
          if (!isOptionsFunction && currentOptions)
            currentOptions = { ...currentOptions };
          if (autoBody && autoBody.formData && event && !isOptionsFunction) {
            const { type, target } = event as SubmitEvent;
            if (
              type === "submit" &&
              target &&
              target instanceof HTMLFormElement &&
              target.nodeName === "FORM"
            ) {
              (currentOptions as HMPLRequestInit).body = new FormData(
                target,
                (event as SubmitEvent).submitter
              );
            }
          }
          const requestInit: HMPLRequestInit | undefined = isOptionsFunction
            ? getRequestInitFromFn(
                currentOptions as HMPLRequestInitFunction,
                event
              )
            : (currentOptions as HMPLRequestInit);
          if (!checkObject(requestInit) && requestInit !== undefined)
            createError(
              `${REQUEST_INIT_ERROR}: Expected an object with initialization options`
            );
          makeRequest(
            reqEl,
            reqMainEl,
            dataObj!,
            method,
            source,
            isRequest,
            isRequests,
            isMemo!,
            requestInit,
            templateObject,
            reqObject,
            indicators
          );
        };
        let requestFunction = reqFunction;
        if (after) {
          const setEvents = (
            reqEl: Element,
            event: string,
            selector: string,
            options:
              | HMPLRequestInitFunction
              | HMPLRequestInit
              | HMPLIdentificationRequestInit[],
            templateObject: HMPLInstance,
            data: HMPLData,
            isArray: boolean,
            isRequests: boolean,
            reqMainEl?: Element,
            reqObject?: HMPLRequest,
            currentHMPLElement?: HMPLElement
          ) => {
            const els = reqMainEl!.querySelectorAll(selector);
            if (els.length === 0) {
              createError(`${RENDER_ERROR}: Selectors nodes not found`);
            }
            const afterFn = isAll
              ? (evt: Event) => {
                  reqFunction(
                    reqEl,
                    options,
                    templateObject,
                    data,
                    reqMainEl,
                    isArray,
                    reqObject,
                    isRequests,
                    currentHMPLElement,
                    evt
                  );
                }
              : (evt: Event) => {
                  reqFunction(
                    reqEl,
                    options,
                    templateObject,
                    data,
                    reqMainEl,
                    isArray,
                    reqObject,
                    isRequests,
                    currentHMPLElement,
                    evt
                  );
                  for (let j = 0; j < els.length; j++) {
                    const currentAfterEl = els[j];
                    currentAfterEl.removeEventListener(event, afterFn);
                  }
                };
            for (let i = 0; i < els.length; i++) {
              const afterEl = els[i];
              afterEl.addEventListener(event, afterFn);
            }
          };
          if (after.indexOf(":") > 0) {
            const afterArr = after.split(":");
            const event = afterArr[0];
            const selector = afterArr.slice(1).join(":");
            requestFunction = (
              reqEl,
              options,
              templateObject,
              data,
              reqMainEl,
              isArray: boolean = false,
              reqObject,
              isRequests = false,
              currentHMPLElement
            ) => {
              setEvents(
                reqEl,
                event,
                selector,
                options,
                templateObject,
                data,
                isArray,
                isRequests,
                reqMainEl,
                reqObject,
                currentHMPLElement
              );
            };
          } else {
            createError(
              `${REQUEST_OBJECT_ERROR}: The "${AFTER}" property doesn't work without EventTargets`
            );
          }
        } else {
          if (!isModeUndefined) {
            createError(
              `${REQUEST_OBJECT_ERROR}: The "${MODE}" property doesn't work without "${AFTER}" property`
            );
          }
        }
        return requestFunction;
      }
    } else {
      createError(
        `${REQUEST_OBJECT_ERROR}: The "source" property are not found or empty`
      );
    }
  };

  let reqFn: any;
  if (isRequest) {
    requests[0].el = currentEl as Comment;
    reqFn = renderRequest(requests[0]);
  } else {
    let id = -2;
    const getRequests = (currrentElement: ChildNode) => {
      id++;
      if (currrentElement.nodeType == 8) {
        let value = currrentElement.nodeValue;
        if (value && value.startsWith(COMMENT)) {
          value = value.slice(4);
          const currentIndex = Number(value);
          const currentRequest = requests[currentIndex];
          if (Number.isNaN(currentIndex) || currentRequest === undefined) {
            createError(`${RENDER_ERROR}: Request object not found`);
          }
          currentRequest.el = currrentElement as Comment;
          currentRequest.nodeId = id;
        }
      }
      if (currrentElement.hasChildNodes()) {
        const chNodes = currrentElement.childNodes;
        for (let i = 0; i < chNodes.length; i++) {
          getRequests(chNodes[i]);
        }
      }
    };
    getRequests(currentEl);
    const algorithm: HMPLRequestFunction[] = [];
    for (let i = 0; i < requests.length; i++) {
      const currentRequest = requests[i];
      algorithm.push(renderRequest(currentRequest, currentEl as Element)!);
    }
    if (requests.length > 1) {
      reqFn = (
        reqEl: Element,
        options: HMPLRequestInit | HMPLIdentificationRequestInit[],
        templateObject: HMPLInstance,
        data: HMPLData,
        mainEl: Element,
        isArray: boolean = false
      ) => {
        if (!reqEl) {
          reqEl = mainEl;
        }
        const requests: HMPLRequest[] = [];
        const els = data.els;
        for (let i = 0; i < els.length; i++) {
          const hmplElement = els[i];
          const currentReqEl = hmplElement.el;
          if (currentReqEl.parentNode === null) {
            createError(`${RENDER_ERROR}: ParentNode is null`);
          }
          const currentReqFn = algorithm[i];
          const currentReq: HMPLRequest = {
            response: undefined
          };
          currentReqFn!(
            currentReqEl,
            options,
            templateObject,
            data,
            reqEl,
            isArray,
            currentReq,
            true,
            hmplElement
          );
          requests.push(currentReq);
        }
        templateObject.requests = requests;
      };
    } else {
      const currentRequest = requests[0];
      if (currentRequest.el!.parentNode === null) {
        createError(`${RENDER_ERROR}: ParentNode is null`);
      }
      reqFn = renderRequest(currentRequest, currentEl as Element);
    }
  }
  return fn(reqFn!);
};

/**
 * Validates the options provided for a request.
 * @param currentOptions - The options to validate.
 */
const validOptions = (
  currentOptions: HMPLRequestInit | HMPLRequestInitFunction
) => {
  const isObject = checkObject(currentOptions);
  if (
    !isObject &&
    !checkFunction(currentOptions) &&
    currentOptions !== undefined
  )
    createError(
      `${REQUEST_INIT_ERROR}: Expected an object with initialization options`
    );
  if (isObject && (currentOptions as HMPLRequestInit).get) {
    if (!checkFunction((currentOptions as HMPLRequestInit).get)) {
      createError(
        `${REQUEST_INIT_ERROR}: The "get" property has a function value`
      );
    }
  }
};

/**
 * Validates the autoBody options.
 * @param autoBody - The autoBody option to validate.
 */
const validAutoBody = (autoBody: boolean | HMPLAutoBodyOptions) => {
  const isObject = checkObject(autoBody);
  if (typeof autoBody !== "boolean" && !isObject)
    createError(
      `${REQUEST_OBJECT_ERROR}: Expected a boolean or object, but got neither`
    );
  if (isObject) {
    for (const key in autoBody as HMPLAutoBodyOptions) {
      switch (key) {
        case FORM_DATA:
          if (typeof autoBody[FORM_DATA] !== "boolean")
            createError(
              `${REQUEST_OBJECT_ERROR}: The "${FORM_DATA}" property should be a boolean`
            );
          break;
        default:
          createError(`${REQUEST_OBJECT_ERROR}: Unexpected property "${key}"`);
          break;
      }
    }
  }
};

/**
 * Validates the HMPLIdentificationRequestInit object.
 * @param currentOptions - The identification options to validate.
 */
const validIdOptions = (currentOptions: HMPLIdentificationRequestInit) => {
  if (checkObject(currentOptions)) {
    if (
      !currentOptions.hasOwnProperty("id") ||
      !currentOptions.hasOwnProperty("value")
    ) {
      createError(`${REQUEST_OBJECT_ERROR}: Missing "id" or "value" property`);
    }
  } else {
    createError(
      `${REQUEST_OBJECT_ERROR}: IdentificationRequestInit must be of type object`
    );
  }
};

/**
 * Validates an array of HMPLIdentificationRequestInit objects.
 * @param currentOptions - The array of identification options to validate.
 */
const validIdentificationOptionsArray = (
  currentOptions: HMPLIdentificationRequestInit[]
) => {
  const ids: Array<string | number> = [];
  for (let i = 0; i < currentOptions.length; i++) {
    const idOptions = currentOptions[i];
    if (!checkObject(idOptions))
      createError(`${REQUEST_OBJECT_ERROR}: Options is of type object`);
    validIdOptions(idOptions);
    const { id } = idOptions;
    if (typeof idOptions.id !== "string" && typeof idOptions.id !== "number")
      createError(`${REQUEST_OBJECT_ERROR}: ID must be a string or a number`);
    if (ids.indexOf(id) > -1) {
      createError(
        `${REQUEST_OBJECT_ERROR}: ID with value "${id}" already exists`
      );
    } else {
      ids.push(id);
    }
  }
};

/**
 * Converts a HMPLRequestInfo object to a JSON string.
 * @param info - The HMPLRequestInfo object.
 * @returns The JSON string representation.
 */
export const stringify = (info: HMPLRequestInfo) => {
  return JSON5.stringify(info);
};

/**
 * Compiles a template string into a HMPLTemplateFunction.
 * @param template - The template string.
 * @param options - The compilation options.
 * @returns A function that creates template instances.
 */
export const compile: HMPLCompile = (
  template: string,
  options: HMPLCompileOptions = {}
) => {
  if (typeof template !== "string")
    createError(
      `${COMPILE_ERROR}: Template was not found or the type of the passed value is not string`
    );
  if (!template)
    createError(`${COMPILE_ERROR}: Template must not be a falsey value`);
  if (!checkObject(options))
    createError(`${COMPILE_ERROR}: Options must be an object`);
  const isMemoUndefined = !options.hasOwnProperty(MEMO);
  if (!isMemoUndefined && typeof options[MEMO] !== "boolean")
    createError(
      `${REQUEST_OBJECT_ERROR}: The value of the property ${MEMO} must be a boolean value`
    );
  const isAutoBodyUndefined = !options.hasOwnProperty(AUTO_BODY);
  if (!isAutoBodyUndefined) validAutoBody(options[AUTO_BODY]!);
  const requests: HMPLRequestsObject[] = [];
  const templateArr = template.split(MAIN_REGEX).filter(Boolean);
  const requestsIndexes: number[] = [];
  for (const match of template.matchAll(MAIN_REGEX)) {
    requestsIndexes.push(match.index);
  }
  if (requestsIndexes.length === 0)
    createError(`${PARSE_ERROR}: Request not found`);
  const prepareText = (text: string) => {
    text = text.trim();
    text = text.replace(/\r?\n|\r/g, "");
    return text;
  };
  const setRequest = (text: string, i: number) => {
    const parsedData = JSON5.parse(text);
    for (const key in parsedData) {
      const value = parsedData[key];
      if (!requestOptions.includes(key))
        createError(
          `${REQUEST_OBJECT_ERROR}: Property "${key}" is not processed`
        );
      switch (key) {
        case INDICATORS:
          if (!Array.isArray(value)) {
            createError(
              `${REQUEST_OBJECT_ERROR}: The value of the property "${key}" must be an array`
            );
          }
          break;
        case ID:
          if (typeof value !== "string" && typeof value !== "number") {
            createError(
              `${REQUEST_OBJECT_ERROR}: The value of the property "${key}" must be a string`
            );
          }
          break;
        case MEMO:
        case MODE:
          if (typeof value !== "boolean") {
            createError(
              `${REQUEST_OBJECT_ERROR}: The value of the property "${key}" must be a boolean value`
            );
          }
          break;
        case AUTO_BODY:
          validAutoBody(value);
          break;
        default:
          if (typeof value !== "string") {
            createError(
              `${REQUEST_OBJECT_ERROR}: The value of the property "${key}" must be a string`
            );
          }
          break;
      }
    }
    const requestObject = {
      ...parsedData,
      arrId: i
    };
    requests.push(requestObject as HMPLRequestsObject);
  };
  let stringIndex = 0;
  for (let i = 0; i < templateArr.length; i++) {
    const text = templateArr[i];
    if (requestsIndexes.includes(stringIndex)) {
      const requestObjectArr = text.split(BRACKET_REGEX).filter(Boolean);
      let currentBracketId = -1;
      let newText = "";
      let isFirst = true;
      let isFinal = false;
      for (let j = 0; j < requestObjectArr.length; j++) {
        const requestText = requestObjectArr[j];
        const isOpen = requestText === "{";
        const isClose = requestText === "}";
        if (isOpen) {
          if (isFirst) {
            isFirst = false;
            if (requestObjectArr[j + 1] !== "{") j++;
          } else {
            newText += requestText;
          }
          currentBracketId++;
        } else if (isClose) {
          if (currentBracketId === -1) {
            createError(
              `${PARSE_ERROR}: Handling curly braces in the Request Object`
            );
          }
          if (currentBracketId === 1) {
            isFinal = true;
          }
          if (currentBracketId === 0) {
            setRequest(newText, i);
            currentBracketId--;
            stringIndex += text.length;
            break;
          }
          currentBracketId--;
          newText += requestText;
        } else {
          if (isFinal) {
            if (prepareText(requestText)) {
              createError(
                `${PARSE_ERROR}: There is no empty space between the curly brackets`
              );
            }
          } else {
            newText += requestText;
          }
        }
      }
      if (currentBracketId !== -1) {
        const nextId = i + 1;
        const nextText = templateArr[nextId];
        if (nextText === undefined) {
          createError(
            `${PARSE_ERROR}: Handling curly braces in the Request Object`
          );
        }
        const nextArr = nextText.split(BRACKET_REGEX).filter(Boolean);
        let newNextText = "";
        for (let j = 0; j < nextArr.length; j++) {
          const currentNextText = nextArr[j];
          const isOpen = currentNextText === "{";
          const isClose = currentNextText === "}";
          if (isClose) {
            if (currentBracketId === -1) {
              createError(
                `${PARSE_ERROR}: Handling curly braces in the Request Object`
              );
            }
            if (currentBracketId === 1) {
              isFinal = true;
            }
            if (currentBracketId === 0) {
              const newNextArr = [...nextArr];
              stringIndex += text.length + nextText.length;
              newNextArr.splice(0, j + 1);
              templateArr[nextId] = newNextArr.join("");
              setRequest(newText + newNextText, i);
              currentBracketId--;
              i++;
              break;
            }
            currentBracketId--;
            newNextText += currentNextText;
          } else if (isOpen) {
            newNextText += currentNextText;
            currentBracketId++;
          } else {
            if (isFinal) {
              if (prepareText(currentNextText)) {
                createError(
                  `${PARSE_ERROR}: There is no empty space between the curly brackets`
                );
              }
            } else {
              newNextText += currentNextText;
            }
          }
        }
      }
      if (currentBracketId !== -1) {
        createError(
          `${PARSE_ERROR}: Handling curly braces in the Request Object`
        );
      }
    } else {
      stringIndex += text.length;
    }
  }
  if (requests.length === 0) {
    createError(`${PARSE_ERROR}: Request not found`);
  }
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    const { arrId } = request;
    const comment = `<!--hmpl${i}-->`;
    templateArr[arrId!] = comment;
    delete request.arrId;
  }
  template = templateArr.join("");
  let isRequest = false;
  const getElement = (template: string): Element | Comment | null => {
    const elWrapper = getTemplateWrapper(
      template.trim()
    ) as HTMLTemplateElement;
    if (
      elWrapper.content.childNodes.length > 1 ||
      (elWrapper.content.children.length !== 1 &&
        elWrapper.content.childNodes[0].nodeType !== 8)
    ) {
      createError(
        `${RENDER_ERROR}: Template include only one node with type Element or Comment`
      );
    }
    const prepareNode = (node: ChildNode) => {
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          if ((node as Element).tagName === "pre") return;
          break;
        case Node.TEXT_NODE:
          if (!/\S/.test(node.textContent!)) {
            node.remove();
            return;
          }
          break;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        prepareNode(node.childNodes.item(i));
      }
    };
    prepareNode(elWrapper.content.childNodes[0]);
    let currentEl: Element | Comment | null =
      elWrapper.content.firstElementChild;
    if (!currentEl) {
      const comment = elWrapper.content.firstChild;
      const isComment = comment?.nodeType === 8;
      if (isComment) {
        isRequest = isComment;
        currentEl = comment as Comment;
      } else {
        createError(`${RENDER_ERROR}: Element is undefined`);
      }
    }
    return currentEl;
  };
  const templateEl = getElement(template);
  const renderFn: HMPLRenderFunction = (
    requestFunction: HMPLRequestFunction
  ) => {
    const templateFunction: HMPLTemplateFunction = (
      options:
        | HMPLIdentificationRequestInit[]
        | HMPLRequestInit
        | HMPLRequestInitFunction = {}
    ): HMPLInstance => {
      const el = templateEl!.cloneNode(true) as Element;
      const templateObject: HMPLInstance = {
        response: isRequest ? undefined : el
      };
      const data: HMPLData = {
        dataObjects: [],
        els: [],
        currentId: 0
      };
      if (!isRequest) {
        let id = -2;
        const getRequests = (currrentElement: ChildNode) => {
          id++;
          if (currrentElement.nodeType == 8) {
            const value = currrentElement.nodeValue;
            if (value && value.startsWith(COMMENT)) {
              const elObj: HMPLElement = {
                el: currrentElement as Element,
                id
              };
              data.els.push(elObj);
            }
          }
          if (currrentElement.hasChildNodes()) {
            const chNodes = currrentElement.childNodes;
            for (let i = 0; i < chNodes.length; i++) {
              getRequests(chNodes[i]);
            }
          }
        };
        getRequests(el);
      }
      if (checkObject(options) || checkFunction(options)) {
        validOptions(options as HMPLRequestInit | HMPLRequestInitFunction);
        requestFunction(
          undefined!,
          options as HMPLRequestInit,
          templateObject,
          data,
          el
        );
      } else if (Array.isArray(options)) {
        validIdentificationOptionsArray(
          options as HMPLIdentificationRequestInit[]
        );
        requestFunction(
          undefined!,
          options as HMPLIdentificationRequestInit[],
          templateObject,
          data,
          el,
          true
        );
      }
      return templateObject;
    };
    return templateFunction;
  };
  return renderTemplate(
    templateEl as Element,
    renderFn,
    requests,
    options,
    isMemoUndefined,
    isAutoBodyUndefined,
    isRequest
  );
};
