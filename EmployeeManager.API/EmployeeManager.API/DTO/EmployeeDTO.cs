namespace EmployeeManager.API.DTO
{
    public class EmployeeDTO
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public int PositionId { get; set; }
        public int DepartmentId { get; set; }
        public string Role { get; set; } = "Worker";
    }
}
