from enum import Enum


class Language(str, Enum):
    EN = "en"
    AR = "ar"


LANGUAGE_EN = Language.EN.value
LANGUAGE_AR = Language.AR.value
LANGUAGES = tuple(language.value for language in Language)
DEFAULT_LANGUAGE = LANGUAGE_EN
