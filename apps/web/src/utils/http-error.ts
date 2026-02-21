export class HttpError<TData = unknown> extends Error {
  status: number;
  data: TData | null;

  constructor(message: string, status: number, data: TData | null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

export const isHttpError = <TData = unknown>(error: unknown): error is HttpError<TData> => error instanceof HttpError;

const parseErrorResponseData = async (response: Response): Promise<unknown | null> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
};

export const createHttpError = async (response: Response, message: string): Promise<HttpError> => {
  const data = await parseErrorResponseData(response);
  return new HttpError(`${message} (${response.status})`, response.status, data);
};
