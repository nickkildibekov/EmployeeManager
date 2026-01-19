using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.Models
{
    public class Department
    {
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public ICollection<DepartmentPosition>? DepartmentPositions { get; set; }

        public ICollection<Employee>? Employees { get; set; }

        public ICollection<Equipment>? Equipments { get; set; }
    }
}