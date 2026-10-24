// POST /api/BankAccounts — مرتبطة بالفرع (Branch) لا المخزن (Warehouse).
// الباك ايند يُنشئ حساباً فرعياً في دليل الحسابات تحت الأب 1100 (الصندوق) أو 1110 (البنك).
export interface CreateBankAccountDto {
  bankName: string;
  bankNameAr: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  branchId: string;
  type: number; // 1=Bank, 2=InstaPay, 3=VodafoneCash — default: 1
}

// GET /api/BankAccounts/branch/{branchId}
export interface BankAccount {
  id: string;
  bankName: string;
  bankNameAr: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  accountId: string;
  accountCode: string;
  accountNameInLedger: string;
  branchId: string;
  type: number; // 1=Bank, 2=InstaPay, 3=VodafoneCash
  isActive: boolean;
}

// شكل محلي فقط للجدول الموحَّد في صفحة الإدارة
export interface BankAccountWithBranch extends BankAccount {
  branchName: string;
}

export interface UpdateBankAccountDto {
  id: string;
  bankName: string;
  bankNameAr: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  isActive: boolean;
}

export type BankAccountDetail = BankAccount & Record<string, unknown>;

