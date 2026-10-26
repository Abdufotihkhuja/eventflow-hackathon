export * from './generated/openapi.js';
export * from './runtime.js';
import type { paths } from './generated/openapi.js';
type HttpMethodLower = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';
type MediaValue<T> = T extends {
    content: infer Content;
} ? Content extends Record<string, infer Value> ? Value : never : never;
type ResponseByCode<Responses, Code extends string | number> = Code extends keyof Responses ? Responses[Code] : never;
export type ApiPath = keyof paths;
export type ApiOperation<Path extends ApiPath, Method extends keyof paths[Path] & HttpMethodLower> = Exclude<paths[Path][Method], undefined>;
export type OperationRequestBody<Path extends ApiPath, Method extends keyof paths[Path] & HttpMethodLower> = ApiOperation<Path, Method> extends {
    requestBody: infer Body;
} ? MediaValue<Body> : never;
export type OperationQuery<Path extends ApiPath, Method extends keyof paths[Path] & HttpMethodLower> = ApiOperation<Path, Method> extends {
    parameters: infer Params;
} ? Params extends {
    query?: infer Query;
} ? Query : never : never;
export type OperationPathParams<Path extends ApiPath, Method extends keyof paths[Path] & HttpMethodLower> = ApiOperation<Path, Method> extends {
    parameters: infer Params;
} ? Params extends {
    path?: infer PathParams;
} ? PathParams : never : never;
export type OperationSuccessResponse<Path extends ApiPath, Method extends keyof paths[Path] & HttpMethodLower> = ApiOperation<Path, Method> extends {
    responses: infer Responses;
} ? MediaValue<ResponseByCode<Responses, 200>> | MediaValue<ResponseByCode<Responses, 201>> | MediaValue<ResponseByCode<Responses, 202>> | MediaValue<ResponseByCode<Responses, 203>> | MediaValue<ResponseByCode<Responses, 204>> | MediaValue<ResponseByCode<Responses, 206>> | MediaValue<ResponseByCode<Responses, 'default'>> : never;
//# sourceMappingURL=index.d.ts.map