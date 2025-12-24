using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<Position> Positions => Set<Position>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<Equipment> Equipments => Set<Equipment>();
        public DbSet<EquipmentCategory> EquipmentCategories => Set<EquipmentCategory>();
        public DbSet<ScheduleEntry> ScheduleEntries => Set<ScheduleEntry>();

        public DbSet<DepartmentPosition> DepartmentPositions => Set<DepartmentPosition>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<DepartmentPosition>()
                .HasKey(dp => new { dp.DepartmentId, dp.PositionId });

            modelBuilder.Entity<DepartmentPosition>()
                .HasOne(dp => dp.Department)
                .WithMany(d => d.DepartmentPositions) 
                .HasForeignKey(dp => dp.DepartmentId);

            modelBuilder.Entity<DepartmentPosition>()
                .HasOne(dp => dp.Position)
                .WithMany(p => p.DepartmentPositions) 
                .HasForeignKey(dp => dp.PositionId);

            modelBuilder.Entity<Department>()
                .HasMany(d => d.Employees)
                .WithOne(e => e.Department)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Position)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.PositionId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Equipment>()
                .HasOne(e => e.Category)
                .WithMany(c => c.Equipments)
                .HasForeignKey(e => e.CategoryId)
                .IsRequired() 
                .OnDelete(DeleteBehavior.Restrict);

        }
    }
}