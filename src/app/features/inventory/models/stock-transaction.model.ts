export interface StockMovementDto {
  transactionId: string;
  date: string | null;
  productName: string;
  warehouseName: string;
  type: string | number;
  quantity: number;
  unitCost: number;
  totalValue: number;
  notes: string | null;
}
