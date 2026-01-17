using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class DepartmentDTO
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Department name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        public List<PositionDTO> Positions { get; set; } = new();
        public List<EmployeeDTO> Employees { get; set; } = new();
        public List<EquipmentDTO> Equipments { get; set; } = new();
    }
}
