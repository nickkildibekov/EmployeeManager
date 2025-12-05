using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class PositionDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;

    }
}
