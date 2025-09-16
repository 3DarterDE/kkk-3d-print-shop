export interface FilterOption {
  _id?: string;
  name: string;
  value: string;
  sortOrder: number;
  color?: string; // Hex color code for color filters
}

export interface Filter {
  _id?: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'range' | 'color';
  options: FilterOption[];
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductFilter {
  _id?: string;
  productId: string;
  filterId: string;
  filterName: string;
  values: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
