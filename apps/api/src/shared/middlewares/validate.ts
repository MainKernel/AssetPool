import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export interface ValidatedData<TBody = unknown, TQuery = unknown, TParams = unknown> {
  body: TBody;
  query: TQuery;
  params: TParams;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validated?: ValidatedData;
    }
  }
}

interface ValidateSchemas<
  TBody extends ZodTypeAny = ZodTypeAny,
  TQuery extends ZodTypeAny = ZodTypeAny,
  TParams extends ZodTypeAny = ZodTypeAny,
> {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
}

export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const validated: ValidatedData = {
      body: schemas.body ? schemas.body.parse(req.body) : req.body,
      query: schemas.query ? schemas.query.parse(req.query) : req.query,
      params: schemas.params ? schemas.params.parse(req.params) : req.params,
    };
    req.validated = validated;
    next();
  };
}
