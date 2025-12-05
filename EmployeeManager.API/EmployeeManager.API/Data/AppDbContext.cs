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
        public DbSet<WorkShift> WorkShifts => Set<WorkShift>();

        // NEW: DbSet for the Many-to-Many Join Entity
        public DbSet<DepartmentPosition> DepartmentPositions => Set<DepartmentPosition>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // -----------------------------------------------------------------
            // 1. Department <-> Position (Many-to-Many configuration)
            // -----------------------------------------------------------------

            // Configure the composite primary key for the join table
            modelBuilder.Entity<DepartmentPosition>()
                .HasKey(dp => new { dp.DepartmentId, dp.PositionId });

            // Define the relationships for DepartmentPosition
            modelBuilder.Entity<DepartmentPosition>()
                .HasOne(dp => dp.Department)
                .WithMany(d => d.DepartmentPositions) // Department now links to the join table
                .HasForeignKey(dp => dp.DepartmentId);

            modelBuilder.Entity<DepartmentPosition>()
                .HasOne(dp => dp.Position)
                .WithMany(p => p.DepartmentPositions) // Position now links to the join table
                .HasForeignKey(dp => dp.PositionId);

            // -----------------------------------------------------------------
            // 2. Department <-> Employee (One-to-Many)
            // -----------------------------------------------------------------
            modelBuilder.Entity<Department>()
                .HasMany(d => d.Employees)
                .WithOne(e => e.Department)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            // -----------------------------------------------------------------
            // 3. Employee <-> Position (One-to-Many)
            // -----------------------------------------------------------------
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Position)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.PositionId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);

            // -----------------------------------------------------------------
            // 4. WorkShift <-> Employee (One-to-Many)
            // -----------------------------------------------------------------
            modelBuilder.Entity<WorkShift>()
                .HasOne(ws => ws.Employee)
                .WithMany() // Assuming Employee does not have a navigation property back to WorkShift
                .HasForeignKey(ws => ws.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}