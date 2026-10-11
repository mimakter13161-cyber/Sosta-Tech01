import { Product } from '../types';

export const getProductCategory = (product: Pick<Product, 'category' | 'brand' | 'series'>) =>
  product.category?.trim()
  || (product.brand === 'Apple'
    ? 'iPhone'
    : product.brand === 'Samsung'
      ? 'Android'
      : product.series);

export const getProductCategories = (products: Product[]) =>
  Array.from(new Set(products.map(getProductCategory).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right));
