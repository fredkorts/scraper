export interface PageWindowOptions {
    page: number;
    totalPages: number;
    siblingCount?: number;
    boundaryCount?: number;
}

export type PageWindowItem =
    | {
          kind: "page";
          page: number;
      }
    | {
          kind: "ellipsis";
          id: string;
      };
