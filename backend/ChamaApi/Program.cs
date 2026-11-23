using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});
builder.Services.AddOpenApi();

var app = builder.Build();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

string filePath = "members.json";
List<Member> members = new();

List<Member> LoadMembers()
{
    if (File.Exists(filePath))
    {
        var json = File.ReadAllText(filePath);
        return JsonSerializer.Deserialize<List<Member>>(json) ?? new List<Member>();
    }

    return new List<Member>
    {
        new Member(1, "Carolyne Karembo", "0712345678", 15000, 0),
        new Member(2, "Kevin Nyale", "0722345678", 12000, 0),
        new Member(3, "Uncle Tana", "0733345678", 18000, 0),
    };
}

void SaveMembers()
{
    var json = JsonSerializer.Serialize(members);
    File.WriteAllText(filePath, json);
}

members = LoadMembers();

app.MapGet("/api/members", () => members);

app.MapPost("/api/members", (CreateMemberRequest req) =>
{
    var id = members.Count > 0 ? members.Max(m => m.Id) + 1 : 1;
    var member = new Member(id, req.Name, req.Phone, req.TotalContributed, 0);
    members.Add(member);
    SaveMembers();
    return member;
});

app.MapDelete("/api/members/{id}", (int id) =>
{
    var member = members.FirstOrDefault(m => m.Id == id);
    if (member == null) return Results.NotFound();
    members.Remove(member);
    SaveMembers();
    return Results.Ok(member);
});

app.MapPut("/api/members/{id}/contribute", (int id, ContributeRequest req) =>
{
    var member = members.FirstOrDefault(m => m.Id == id);
    if (member == null) return Results.NotFound();

    var index = members.FindIndex(m => m.Id == id);
    var updated = new Member(member.Id, member.Name, member.Phone, member.TotalContributed + req.Amount, member.LoanBalance);
    members[index] = updated;
    SaveMembers();
    return Results.Ok(updated);
});

// NEW: Give Loan
app.MapPut("/api/members/{id}/loan", (int id, LoanRequest req) =>
{
    var member = members.FirstOrDefault(m => m.Id == id);
    if (member == null) return Results.NotFound();

    var index = members.FindIndex(m => m.Id == id);
    var updated = new Member(member.Id, member.Name, member.Phone, member.TotalContributed, member.LoanBalance + req.Amount);
    members[index] = updated;
    SaveMembers();
    return Results.Ok(updated);
});

// NEW: Repay Loan
app.MapPut("/api/members/{id}/repay", (int id, LoanRequest req) =>
{
    var member = members.FirstOrDefault(m => m.Id == id);
    if (member == null) return Results.NotFound();

    var index = members.FindIndex(m => m.Id == id);
    var newBalance = Math.Max(0, member.LoanBalance - req.Amount);
    var updated = new Member(member.Id, member.Name, member.Phone, member.TotalContributed, newBalance);
    members[index] = updated;
    SaveMembers();
    return Results.Ok(updated);
});

app.Run();

record Member(int Id, string Name, string Phone, int TotalContributed, int LoanBalance = 0);
record CreateMemberRequest(string Name, string Phone, int TotalContributed);
record ContributeRequest(int Amount);
record LoanRequest(int Amount);