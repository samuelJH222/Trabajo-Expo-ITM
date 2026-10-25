
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "clave-solo-para-desarrollo",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 2 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Consultar resultados de las encuestas
app.get("/api/encuestas", async (req, res) => {
    try {
        const [filas] = await pool.execute(`
            SELECT
                r.id,
                p.nombre,
                r.vasos_agua,
                r.actividad_fisica,
                r.horas_sueno,
                r.alimentacion,
                r.fecha_respuesta AS fecha_registro
            FROM respuestas r
            INNER JOIN participantes p
                ON r.participante_id = p.id
            ORDER BY r.fecha_respuesta DESC
        `);

        res.json(filas);
    } catch (error) {
        console.error("Error consultando encuestas:", error.message);
        res.status(500).json({
            mensaje: "No se pudieron consultar las encuestas."
        });
    }
});

// Registrar participante desde index.html
app.post("/api/participantes", async (req, res) => {
    try {
        const { nombre, correo } = req.body;

        if (
            typeof nombre !== "string" ||
            !nombre.trim() ||
            nombre.trim().length > 100 ||
            typeof correo !== "string" ||
            correo.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
        ) {
            return res.status(400).json({
                mensaje: "Ingresa un nombre y un correo válidos."
            });
        }

        const correoNormalizado = correo.trim().toLowerCase();

        let participanteId;

        const [existentes] = await pool.execute(
            "SELECT id FROM participantes WHERE correo = ?",
            [correoNormalizado]
        );

        if (existentes.length > 0) {
            participanteId = existentes[0].id;

            const [respuestasPrevias] = await pool.execute(
                "SELECT id FROM respuestas WHERE participante_id = ?",
                [participanteId]
            );

            if (respuestasPrevias.length > 0) {
                return res.status(409).json({
                    mensaje: "Este correo ya tiene una encuesta registrada."
                });
            }
        } else {
            const [resultado] = await pool.execute(
                `INSERT INTO participantes (nombre, correo)
                 VALUES (?, ?)`,
                [nombre.trim(), correoNormalizado]
            );

            participanteId = resultado.insertId;
        }

        req.session.participanteId = participanteId;

        res.status(200).json({
            mensaje: "Participante registrado correctamente.",
            continuar: "/form.html"
        });
    } catch (error) {
        console.error("Error registrando participante:", error.message);
        res.status(500).json({
            mensaje: "No se pudo registrar al participante."
        });
    }
});

// Guardar la encuesta del participante actual
app.post("/api/respuestas", async (req, res) => {
    try {
        const participanteId = req.session.participanteId;

        if (!participanteId) {
            return res.status(401).json({
                mensaje: "Primero debes registrarte."
            });
        }
        const {
        agua,
        ejercicio,
        sueno,
        alimentacion,
        lugar_tiempo_libre
        } = req.body;

        if (
            !Number.isInteger(agua) ||
            agua < 0 ||
            agua > 100 ||
            !["0", "1-2", "3-4", "5-7"].includes(ejercicio) ||
            typeof sueno !== "number" ||
            !Number.isFinite(sueno) ||
            sueno < 0 ||
            sueno > 24 ||
            !["variada", "poco-variada", "no-seguro"].includes(alimentacion)
        ) {
            return res.status(400).json({
                mensaje: "Verifica los datos del formulario."
            });
        }

        const [previas] = await pool.execute(
            "SELECT id FROM respuestas WHERE participante_id = ?",
            [participanteId]
        );

        if (previas.length > 0) {
            return res.status(409).json({
                mensaje: "Ya enviaste tu encuesta."
            });
        }

        await pool.execute(
            `INSERT INTO respuestas
                (participante_id, vasos_agua, actividad_fisica,
                 horas_sueno, alimentacion)
             VALUES (?, ?, ?, ?, ?)`,
            [participanteId, agua, ejercicio, sueno, alimentacion]
        );

        res.status(201).json({
            mensaje: "¡Tu encuesta se guardó correctamente!"
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Ya enviaste tu encuesta."
            });
        }

        console.error("Error guardando respuesta:", error.message);
        res.status(500).json({
            mensaje: "No se pudo guardar la encuesta."
        });
    }
});

async function iniciarServidor() {
    try {
        await pool.query("SELECT 1");

        const PORT = process.env.PORT || 3000;

        app.listen(PORT, () => {
            console.log(`Servidor activo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error conectando con MySQL:", error.message);
        process.exit(1);
    }
}

iniciarServidor();
