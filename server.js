
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        name: "habitos.sid",
        secret: process.env.SESSION_SECRET || "habitos-sanos-sesion",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use(express.static(path.join(__dirname, "public")));

// --------------------------------------------------
// CONEXIÓN CON MYSQL
// --------------------------------------------------

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "habitos_saludables",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then((conexion) => {
        console.log("Conexión con MySQL establecida.");
        conexion.release();
    })
    .catch((error) => {
        console.error("Error conectando con MySQL:", error.message);
    });

// --------------------------------------------------
// GET: CONSULTAR RESPUESTAS
// --------------------------------------------------

async function obtenerRespuestas(req, res) {
    try {
        const [resultados] = await pool.query(`
            SELECT
                r.*,
                p.nombre,
                p.correo AS email
            FROM respuestas AS r
            LEFT JOIN participantes AS p
                ON r.participante_id = p.id
            ORDER BY r.id DESC
        `);

        res.json(resultados);
    } catch (error) {
        console.error("Error consultando respuestas:", error.message);

        res.status(500).json({
            error: "No se pudieron consultar las respuestas."
        });
    }
}

app.get("/api/respuestas", obtenerRespuestas);
app.get("/api/encuestas", obtenerRespuestas);

// --------------------------------------------------
// GET: TOTAL DE PARTICIPANTES
// --------------------------------------------------

app.get("/api/participantes/total", async (req, res) => {
    try {
        const [resultado] = await pool.query(
            "SELECT COUNT(*) AS total FROM participantes"
        );

        res.json({
            total: Number(resultado[0].total)
        });
    } catch (error) {
        console.error("Error contando participantes:", error.message);

        res.status(500).json({
            error: "No se pudo consultar el total de participantes."
        });
    }
});

// --------------------------------------------------
// POST: REGISTRAR PARTICIPANTE
// --------------------------------------------------

app.post("/api/participantes", async (req, res) => {
    try {
        const nombre = String(req.body.nombre || "").trim();

        const correo = String(
            req.body.correo || req.body.email || ""
        ).trim().toLowerCase();

        if (!nombre || !correo) {
            return res.status(400).json({
                error: "Debes ingresar tu nombre y correo."
            });
        }

        const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

        if (!correoValido) {
            return res.status(400).json({
                error: "Ingresa un correo electrónico válido."
            });
        }

        const [existentes] = await pool.query(
            "SELECT id FROM participantes WHERE correo = ?",
            [correo]
        );

        let participanteId;

        if (existentes.length > 0) {
            participanteId = existentes[0].id;

            const [respuestasPrevias] = await pool.query(
                "SELECT id FROM respuestas WHERE participante_id = ?",
                [participanteId]
            );

            if (respuestasPrevias.length > 0) {
                return res.status(409).json({
                    error: "Este correo ya registró una respuesta."
                });
            }
        } else {
            const [resultado] = await pool.query(
                `INSERT INTO participantes (nombre, correo)
                 VALUES (?, ?)`,
                [nombre, correo]
            );

            participanteId = resultado.insertId;
        }

        // Asociar el participante con la sesión actual.
        req.session.participanteId = participanteId;

        // No responder hasta que la sesión esté guardada.
        req.session.save((error) => {
            if (error) {
                console.error("Error guardando la sesión:", error.message);

                return res.status(500).json({
                    error: "El participante se registró, pero no se pudo guardar la sesión."
                });
            }

            console.log(
                "Sesión iniciada para el participante:",
                participanteId
            );

            res.json({
                mensaje: "Participante registrado correctamente.",
                participanteId
            });
        });
    } catch (error) {
        console.error("Error registrando participante:", error.message);

        res.status(500).json({
            error: "No se pudo registrar el participante."
        });
    }
});

// --------------------------------------------------
// POST: GUARDAR RESPUESTAS
// --------------------------------------------------

app.post("/api/respuestas", async (req, res) => {
    try {
        const participanteId = req.session.participanteId;

        // La sesión debe proceder del registro inicial.
        if (!participanteId) {
            console.warn(
                "POST /api/respuestas rechazado: no hay participante en la sesión."
            );

            return res.status(401).json({
                error: "No se encontró tu sesión. Regresa a la página inicial y vuelve a ingresar."
            });
        }

        const {
            vasos_agua,
            actividad_fisica,
            horas_sueno,
            alimentacion,
            lugar_tiempo_libre,
            fruta,
            actividad_habitual,
            lavado_manos,
            sueno_regular,
            ropa_dia,
            utensilios_limpieza,
            bebidas_azucaradas,
            celular_antes_dormir
        } = req.body;

        const campos = {
            vasos_agua,
            actividad_fisica,
            horas_sueno,
            alimentacion,
            lugar_tiempo_libre,
            fruta,
            actividad_habitual,
            lavado_manos,
            sueno_regular,
            ropa_dia,
            utensilios_limpieza,
            bebidas_azucaradas,
            celular_antes_dormir
        };

        const faltantes = Object.entries(campos).filter(
            ([, valor]) =>
                valor === undefined ||
                valor === null ||
                String(valor).trim() === ""
        );

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: "Completa todas las preguntas antes de enviar.",
                camposFaltantes: faltantes.map(([campo]) => campo)
            });
        }

        const agua = Number(vasos_agua);
        const sueno = Number(horas_sueno);

        if (!Number.isFinite(agua) || agua < 0 || agua > 100) {
            return res.status(400).json({
                error: "La cantidad de agua no es válida."
            });
        }

        if (!Number.isFinite(sueno) || sueno < 0 || sueno > 24) {
            return res.status(400).json({
                error: "Las horas de sueño deben estar entre 0 y 24."
            });
        }

        const frecuencias = [
            fruta,
            actividad_habitual,
            lavado_manos,
            sueno_regular,
            ropa_dia,
            utensilios_limpieza,
            bebidas_azucaradas,
            celular_antes_dormir
        ];

        const permitidas = [
            "nunca",
            "a_veces",
            "frecuentemente",
            "siempre"
        ];

        if (
            frecuencias.some(
                (valor) =>
                    typeof valor !== "string" ||
                    !permitidas.includes(valor)
            )
        ) {
            return res.status(400).json({
                error: "Una o más respuestas de hábitos no son válidas."
            });
        }

        // Evitar respuestas duplicadas.
        const [previas] = await pool.query(
            "SELECT id FROM respuestas WHERE participante_id = ?",
            [participanteId]
        );

        if (previas.length > 0) {
            return res.status(409).json({
                error: "Este participante ya respondió la encuesta."
            });
        }

        await pool.query(
            `INSERT INTO respuestas (
                participante_id,
                vasos_agua,
                actividad_fisica,
                horas_sueno,
                alimentacion,
                lugar_tiempo_libre,
                fruta,
                actividad_habitual,
                lavado_manos,
                sueno_regular,
                ropa_dia,
                utensilios_limpieza,
                bebidas_azucaradas,
                celular_antes_dormir
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                participanteId,
                agua,
                actividad_fisica,
                sueno,
                alimentacion,
                lugar_tiempo_libre,
                fruta,
                actividad_habitual,
                lavado_manos,
                sueno_regular,
                ropa_dia,
                utensilios_limpieza,
                bebidas_azucaradas,
                celular_antes_dormir
            ]
        );

        console.log(
            "Encuesta guardada para el participante:",
            participanteId
        );

        res.status(201).json({
            mensaje: "Encuesta guardada correctamente."
        });
    } catch (error) {
        console.error("Error guardando respuestas:", error);

        res.status(500).json({
            error: "No se pudieron guardar las respuestas. Revisa la consola del servidor y las columnas de la tabla respuestas."
        });
    }
});

// --------------------------------------------------
// INICIAR SERVIDOR
// --------------------------------------------------

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
