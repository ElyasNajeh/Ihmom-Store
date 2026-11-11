from enum import Enum

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MAX_PAGE_NUMBER = 1000
DEFAULT_SEARCH_MIN_LENGTH = 1


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


DEFAULT_SORT_DIRECTION = SortDirection.DESC
