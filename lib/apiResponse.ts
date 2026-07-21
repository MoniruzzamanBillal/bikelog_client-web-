// type TgenericResponse<TData> = {
//   data: TData;
//   statusCode: number;
//   success: boolean;
//   message: string;
// };

export type TmetaResponse = {
  currentPage: number;
  itemCount: number;
  limit: number;
  totalItems: number;
  totalPage: number;
};

export type TgenericResponse<TData> = {
  data: TData;
  statusCode: number;
  success: boolean;
  message: string;
  meta: TmetaResponse;
};

// export type TgenericResponse<TData> = {
//   statusCode: number;
//   success: boolean;
//   message: string;
//   meta: TmetaResponse;
// } & (
//   | {
//       data: TData;
//       dataList?: never;
//     }
//   | {
//       data?: never;
//       dataList: TData[];
//     }
// );
