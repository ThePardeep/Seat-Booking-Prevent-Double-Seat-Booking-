const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const pg = require("pg");
const dotenv = require("dotenv").config();

const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// PORT
const PORT = process.argv[2] || 3000;

//bodyParser MiddleWare
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//EJC MIDDLEWARE
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  let seats = [];
  try {
    const client = await pool.connect();
    seats = await client.query(
      "SELECT * FROM public.seats ORDER BY seat_id ASC"
    );
    client.release();
  } catch (error) {
    throw new Error(error);
  }
  res.render("home", { seats: seats.rows });
});

app.get("/book/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const client = await pool.connect();

    await client.query("BEGIN");
    const seat = await client.query(
      "SELECT * FROM public.seats WHERE seat_id=$1 FOR UPDATE",
      [id]
    );
    if (seat.rows[0].is_booked) {
      res.json({
        error: true,
        msg: "Seat Already Booked",
      });
      await client.query("COMMIT");
      return;
    }

    await client.query(
      "UPDATE public.seats SET is_booked=true WHERE seat_id=$1",
      [id]
    );
    await client.query("COMMIT");
    client.release();
  } catch (error) {
    res.json({
      error: true,
      msg: "Some Server Error",
    });
    throw new Error(error);
  }

  res.json({ success: true, msg: "Seat Booked" });
});

app.listen(PORT, (msg) => console.log("SERVER LISTEN AT PORT " + PORT));
