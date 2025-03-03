import nock from "nock";
import { BASE_URL } from "../config/config";
import { strict as assert } from "assert";
import type { ScopeOptions } from "../core/functions.types";

const createScope = ({
  code = 200,
  template = "<div>123</div>",
  route = "/api/test",
  method = "get"
}: ScopeOptions) => {
  return nock(BASE_URL)[method](route).reply(code, template);
};

const clearScope = (scope: nock.Scope) => {
  assert.strictEqual(scope.isDone(), true, "Not all requests were completed");
  nock.cleanAll();
};

export { createScope, clearScope };
