export type ImportedTourStop = {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  address: string;
  label: string;
  location: string;
};

export type TourImportResponse = {
  tourName: string;
  fileName: string;
  warnings: string[];
  stops: ImportedTourStop[];
};
