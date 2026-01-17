namespace EmployeeManager.API.Helpers
{
    public static class PaginationHelper
    {
        public const int MaxPageSize = 100;
        public const int DefaultPageSize = 10;
        public const int MinPageSize = 1;
        public const int MinPage = 1;

        public static (int page, int pageSize) ValidatePagination(int page, int pageSize)
        {
            page = Math.Max(MinPage, page);
            pageSize = Math.Clamp(pageSize, MinPageSize, MaxPageSize);
            return (page, pageSize);
        }
    }
}
