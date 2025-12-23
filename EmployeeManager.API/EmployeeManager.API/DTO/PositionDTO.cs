using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class PositionDTO
    {
        public int Id { get; set; }
        
        [Required(ErrorMessage = "Position title is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 100 characters")]
        public string Title { get; set; } = string.Empty;
        
        public List<DepartmentDTO> Departments { get; set; } = new List<DepartmentDTO>();
    }
}
