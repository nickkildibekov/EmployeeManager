using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.Models
{
    public class Position
    {
        public Guid Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public ICollection<Employee>? Employees { get; set; }

        public ICollection<DepartmentPosition>? DepartmentPositions { get; set; }
    }
}
