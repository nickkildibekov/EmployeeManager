namespace EmployeeManager.API.DTO
{
    public class EmployeeDTO
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public int PositionId { get; set; }
        public int DepartmentId { get; set; }
    }
}
