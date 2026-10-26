using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddNpgsqlDataSource(
    "Host=localhost;Port=5432;Username=postgres;Password=231a3eed;Database=instagram");

builder.Services.AddCors(options =>
    options.AddPolicy("AllowFront", policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors("AllowFront"); // must go after Build() and before the Map... calls

const string PostsQuery =
    "SELECT p.id, p.user_id, p.image_url, p.description, u.name " +
    "FROM posts p JOIN users u ON u.id = p.user_id ";

// ---------- Users ----------

app.MapPost("/users", async (User user, NpgsqlDataSource db) =>
{
    try
    {
        await using var cmd = db.CreateCommand("INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id");
        cmd.Parameters.AddWithValue(user.Name);
        cmd.Parameters.AddWithValue(user.Email);
        cmd.Parameters.AddWithValue(user.Password);
        user.Id = (int)(await cmd.ExecuteScalarAsync())!;
        user.Password = "231a3eed";
        return Results.Created($"/users/{user.Id}", user);
    }
    catch (PostgresException ex) when (ex.SqlState == "23505") { return Results.Conflict("Email already registered"); }
    catch (Exception ex) { return Results.Problem(ex.Message); }
});

app.MapPost("/login", async (LoginDto data, NpgsqlDataSource db) =>
{
    await using var cmd = db.CreateCommand("SELECT id, name FROM users WHERE email = $1 AND password = $2");
    cmd.Parameters.AddWithValue(data.Email);
    cmd.Parameters.AddWithValue(data.Password);
    await using var reader = await cmd.ExecuteReaderAsync();

    return await reader.ReadAsync() ? Results.Ok(new { id = reader.GetInt32(0), name = reader.GetString(1) }) : Results.Unauthorized();
});

app.MapGet("/users/{id:int}", async (int id, NpgsqlDataSource db) =>
{
    await using var cmd = db.CreateCommand("SELECT id, name FROM users WHERE id = $1");
    cmd.Parameters.AddWithValue(id);
    await using var reader = await cmd.ExecuteReaderAsync();

    return await reader.ReadAsync() ? Results.Ok(new { id = reader.GetInt32(0), name = reader.GetString(1) }) : Results.NotFound();
});

app.MapGet("/users/{id:int}/posts", async (int id, NpgsqlDataSource db) =>
{
    await using var check = db.CreateCommand("SELECT 1 FROM users WHERE id = $1");
    check.Parameters.AddWithValue(id);
    if (await check.ExecuteScalarAsync() is null) return Results.NotFound();

    await using var cmd = db.CreateCommand(PostsQuery + "WHERE p.user_id = $1 ORDER BY p.created_at DESC");
    cmd.Parameters.AddWithValue(id);
    return Results.Ok(await ReadPosts(cmd));
});

// ---------- Posts ----------

app.MapGet("/posts", async (NpgsqlDataSource db) =>
{
    await using var cmd = db.CreateCommand(PostsQuery + "ORDER BY p.created_at DESC");
    return Results.Ok(await ReadPosts(cmd));
});

app.MapPost("/posts", async (Post post, NpgsqlDataSource db) =>
{
    try
    {
        await using var cmd = db.CreateCommand("INSERT INTO posts (user_id, image_url, description) VALUES ($1, $2, $3) RETURNING id");
        cmd.Parameters.AddWithValue(post.UserId);
        cmd.Parameters.AddWithValue(post.ImageUrl);
        cmd.Parameters.AddWithValue(post.Description);
        post.Id = (int)(await cmd.ExecuteScalarAsync())!;
        return Results.Created($"/posts/{post.Id}", post);
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
});

app.MapPut("/posts/{id:int}", async (int id, Post post, NpgsqlDataSource db) =>
{
    await using var cmd = db.CreateCommand("UPDATE posts SET description = $1 WHERE id = $2 AND user_id = $3");
    cmd.Parameters.AddWithValue(post.Description);
    cmd.Parameters.AddWithValue(id);
    cmd.Parameters.AddWithValue(post.UserId);
    return await cmd.ExecuteNonQueryAsync() > 0 ? Results.Ok(post) : Results.NotFound();
});

app.MapDelete("/posts/{id:int}", async (int id, int userId, NpgsqlDataSource db) =>
{
    await using var cmd = db.CreateCommand("DELETE FROM posts WHERE id = $1 AND user_id = $2");
    cmd.Parameters.AddWithValue(id);
    cmd.Parameters.AddWithValue(userId);
    return await cmd.ExecuteNonQueryAsync() > 0 ? Results.NoContent() : Results.NotFound();
});

app.Run("http://localhost:5000");

static async Task<List<Post>> ReadPosts(NpgsqlCommand cmd)
{
    var posts = new List<Post>();
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        posts.Add(new Post
        {
            Id = reader.GetInt32(0),
            UserId = reader.GetInt32(1),
            ImageUrl = reader.GetString(2),
            Description = reader.IsDBNull(3) ? "" : reader.GetString(3),
            UserName = reader.GetString(4)
        });
    }
    return posts;
}