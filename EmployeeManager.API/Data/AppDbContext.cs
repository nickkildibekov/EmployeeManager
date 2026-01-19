using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                return;
            }

            // Suppress pending model changes warning - migrations are handled manually
            optionsBuilder.ConfigureWarnings(warnings =>
                warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        }

        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<Position> Positions => Set<Position>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<Equipment> Equipments => Set<Equipment>();
        public DbSet<EquipmentCategory> EquipmentCategories => Set<EquipmentCategory>();
        public DbSet<ScheduleEntry> ScheduleEntries => Set<ScheduleEntry>();
        public DbSet<Specialization> Specializations => Set<Specialization>();

        public DbSet<DepartmentPosition> DepartmentPositions => Set<DepartmentPosition>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure GUID generation for all entities
            modelBuilder.Entity<Department>()
                .Property(d => d.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<Employee>()
                .Property(e => e.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<Equipment>()
                .Property(e => e.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<Position>()
                .Property(p => p.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<Specialization>()
                .Property(s => s.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<EquipmentCategory>()
                .Property(c => c.Id)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<ScheduleEntry>()
                .Property(s => s.Id)
                .ValueGeneratedOnAdd();

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
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Department>()
                .HasMany(d => d.Equipments)
                .WithOne(e => e.Department)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Position)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.PositionId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Specialization)
                .WithMany(s => s.Employees)
                .HasForeignKey(e => e.SpecializationId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Equipment>()
                .HasOne(e => e.Category)
                .WithMany(c => c.Equipments)
                .HasForeignKey(e => e.CategoryId)
                .IsRequired() 
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Equipment>()
                .HasOne(e => e.ResponsibleEmployee)
                .WithMany()
                .HasForeignKey(e => e.ResponsibleEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure decimal precision for Equipment.Amount
            modelBuilder.Entity<Equipment>()
                .Property(e => e.Amount)
                .HasPrecision(18, 2);

            // Configure decimal precision for ScheduleEntry.Hours
            modelBuilder.Entity<ScheduleEntry>()
                .Property(s => s.Hours)
                .HasPrecision(18, 2);

        }
    }
}