using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.Models
{
    public class Employee
    {
        public int Id { get; set; }

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Phone]
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTime HireDate { get; set; }

        public int PositionId { get; set; }
        public Position? Position { get; set; }

        public int DepartmentId { get; set; }
        public Department? Department { get; set; }
        public string Role { get; set; } = "Worker";
    }
}
