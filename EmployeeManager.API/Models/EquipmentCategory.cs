namespace EmployeeManager.API.Models
{
    public class EquipmentCategory
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public ICollection<Equipment>? Equipments { get; set; }
    }
}
