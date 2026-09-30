export type Header = { kitapAdi: string; isbn: string; yayinevi: string; kitapId: string };

export type SessionSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceFileName: string;
  header: Header;
  testCount: number;
};

export type Test = {
  konuKodu: number;
  konuAdiUks: string;
  konuAdiKitap: string;
  testId: number | '';
  soruSayisi: number;
  testTuru: string;
  cevaplar: string;
};

export type Session = {
  id: string;
  sourceFileName: string;
  header: Header;
  tests: Test[];
};

export type Konu = { sinif: string; ders: string; kod: number; ad: string };
export type TestTuru = { ad: string; id: number | null };

export type SessionDetail = { session: Session; konular: Konu[]; testTurleri: TestTuru[] };

export type AnalyzedTest = {
  testNo: number | '';
  konuAdi: string;
  cevaplar: string;
  not: string;
  konuOnerileri: Konu[];
};

export type TestPayload = {
  konuKodu: number | '';
  konuAdiKitap: string;
  testId: number | '';
  soruSayisi: number;
  testTuru: string;
  cevaplar: string;
};
