using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.Models
{
    public class Employee
    {
        public Guid Id { get; set; }

        public string? FirstName { get; set; }

        public string? LastName { get; set; }

        [Required]
        public string CallSign { get; set; } = string.Empty;

        [Phone]
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTime? BirthDate { get; set; }
        public DateTime HireDate { get; set; }

        public Guid? PositionId { get; set; }
        public Position? Position { get; set; }

        public Guid? DepartmentId { get; set; }
        public Department? Department { get; set; }

        public Guid SpecializationId { get; set; }
        public Specialization Specialization { get; set; } = null!;

        public string Role { get; set; } = "Worker";
    }
}
