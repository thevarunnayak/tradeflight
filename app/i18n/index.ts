import en from "./en.json";
import hi from "./hi.json";
import kn from "./kn.json";

export const languages = {
  en,
  hi,
  kn,
};

export type Language = keyof typeof languages;