export interface CreateListDto {
  title: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateListDto {
  title?: string;
  description?: string | null;
  isPublic?: boolean;
}

export interface AddListItemDto {
  gameSlug: string;
  note?: string;
}
