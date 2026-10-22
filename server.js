require('dotenv').config();

const express = require('express');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { randomUUID, randomBytes, createHash, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const scryptAsync = promisify(scrypt);

// Initialisation de l'application Express et du serveur HTTP
const app = express();
const server = http.createServer(app);

// Initialisation Socket.io pour la messagerie temps réel et les appels
let io;
try {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
} catch (e) {
    console.warn('Socket.io non chargé:', e.message);
}

// Variables d'environnement & configuration
const PORT = Number(process.env.PORT || 10000);
const JWT_SECRET = process.env.JWT_SECRET || 'imo-sn-super-secret-key-2026';
const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const allowedOrigin = process.env.FRONTEND_URL || '*';
const root = __dirname;

// Middlewares Express
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Middleware de sécurité / parsing JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Accès non autorisé' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err || user.authMethod !== 'password') {
            return res.status(403).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
        }
        req.user = user;
        next();
    });
}

// ----------------------------------------------------
// BASE DE DONNÉES : INITIALISATION & DONNÉES PAR DÉFAUT
// ----------------------------------------------------
const DATA_DIR = path.join(root, 'data');
if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_PROPERTIES = [
    {
        id: "1",
        title: "Villa Moderne de Luxe",
        type: "vente",
        category: "Villa",
        price: 185000000,
        priceFormatted: "185 000 000 FCFA",
        location: "Almadies, Dakar",
        city: "Dakar",
        neighborhood: "Almadies",
        bedrooms: 5,
        bathrooms: 3,
        area: 450,
        views: 342,
        featured: true,
        images: [
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=550&fit=crop&q=80",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=550&fit=crop&q=80"
        ],
        description: "Superbe villa contemporaine située dans le quartier résidentiel et sécurisé des Almadies. Finitions haut de gamme, piscine privée, grand jardin paysager, cuisine équipée et groupe électrogène.",
        landlord: {
            name: "Cheikh Fall",
            company: "Imo-SN Prestige",
            phone: "+221 78 984 65 29",
            email: "contact@imo-sn.com",
            address: "Route des Almadies, Dakar",
            verified: true
        }
    },
    {
        id: "2",
        title: "Appartement Meublé Standing",
        type: "location",
        category: "Appartement",
        price: 750000,
        priceFormatted: "750 000 FCFA / mois",
        location: "Plateau, Dakar",
        city: "Dakar",
        neighborhood: "Plateau",
        bedrooms: 3,
        bathrooms: 2,
        area: 180,
        views: 512,
        featured: true,
        images: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=550&fit=crop&q=80",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=550&fit=crop&q=80"
        ],
        description: "Appartement meublé avec goût en plein centre-ville au Plateau. Vue dégagée, sécurité 24h/24, ascenseur, fibre optique et parking sous-sol inclus.",
        landlord: {
            name: "Fatou Sow",
            company: "Dakar Habitat",
            phone: "+221 77 555 44 33",
            email: "f.sow@dakar-habitat.sn",
            address: "Avenue Roume, Dakar Plateau",
            verified: true
        }
    },
    {
        id: "3",
        title: "Villa Balnéaire avec Piscine",
        type: "vente",
        category: "Villa",
        price: 120000000,
        priceFormatted: "120 000 000 FCFA",
        location: "Saly, Mbour",
        city: "Mbour",
        neighborhood: "Saly",
        bedrooms: 4,
        bathrooms: 3,
        area: 380,
        views: 289,
        featured: true,
        images: [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=550&fit=crop&q=80"
        ],
        description: "Magnifique propriété à 5 minutes de la plage de Saly. Grande piscine lagon, terrasse couverte, salon spacieux et dépendance gardien.",
        landlord: {
            name: "Mamadou Diop",
            company: "Saly Immo Conseil",
            phone: "+221 77 111 22 33",
            email: "m.diop@salyimmo.sn",
            address: "Boulevard Maritime, Saly",
            verified: true
        }
    },
    {
        id: "4",
        title: "Terrain Viabilisé & Titre Foncier",
        type: "vente",
        category: "Terrain",
        price: 25000000,
        priceFormatted: "25 000 000 FCFA",
        location: "Diamniadio, Dakar",
        city: "Dakar",
        neighborhood: "Diamniadio",
        bedrooms: 0,
        bathrooms: 0,
        area: 500,
        views: 198,
        featured: false,
        images: [
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=550&fit=crop&q=80"
        ],
        description: "Parcelle viabilisée (eau, électricité, assainissement) avec Titre Foncier individuel. Emplacement stratégique à proximité des ministères et du TER.",
        landlord: {
            name: "Amath Ba",
            company: "Terrains du Cap",
            phone: "+221 76 444 55 66",
            email: "terrains@cap-senegal.com",
            address: "Pôle Urbain de Diamniadio",
            verified: true
        }
    },
    {
        id: "5",
        title: "Duplex Haut Standing",
        type: "location",
        category: "Duplex",
        price: 1200000,
        priceFormatted: "1 200 000 FCFA / mois",
        location: "Mermoz, Dakar",
        city: "Dakar",
        neighborhood: "Mermoz",
        bedrooms: 4,
        bathrooms: 3,
        area: 300,
        views: 430,
        featured: false,
        images: [
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=550&fit=crop&q=80"
        ],
        description: "Duplex spacieux et très lumineux à Mermoz. Quartier calme, double salon, suite parentale avec dressing, climatisation intégrale et groupe électrogène.",
        landlord: {
            name: "Cheikh Fall",
            company: "Imo-SN Prestige",
            phone: "+221 78 984 65 29",
            email: "contact@imo-sn.com",
            address: "Route des Almadies, Dakar",
            verified: true
        }
    },
    {
        id: "6",
        title: "Appartement Vue Mer Panoramique",
        type: "vente",
        category: "Appartement",
        price: 65000000,
        priceFormatted: "65 000 000 FCFA",
        location: "Ngor, Dakar",
        city: "Dakar",
        neighborhood: "Ngor",
        bedrooms: 3,
        bathrooms: 2,
        area: 200,
        views: 671,
        featured: true,
        images: [
            "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=550&fit=crop&q=80"
        ],
        description: "Appartement avec balcon terrasse offrant une vue imprenable sur l'île de Ngor et le coucher de soleil. Résidence récente avec ascenseur.",
        landlord: {
            name: "Aminata Diallo",
            company: "Prestige Immo Dakar",
            phone: "+221 70 999 88 77",
            email: "aminata@prestigeimmo.sn",
            address: "Corniche Ouest, Ngor",
            verified: true
        }
    }
];

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const content = fs.readFileSync(DB_FILE, 'utf-8');
            return JSON.parse(content);
        }
    } catch (e) {
        console.error('Erreur lecture DB:', e.message);
    }
    const initial = {
        properties: INITIAL_PROPERTIES,
        users: [],
        messages: []
    };
    saveDatabase(initial);
    return initial;
}

function saveDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('Erreur sauvegarde DB:', e.message);
    }
}

let db = loadDatabase();

// MongoDB Optionnel (si MONGO_URI configuré)
if (process.env.MONGO_URI) {
    try {
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGO_URI)
            .then(() => console.log('Connecté à MongoDB Atlas avec succès'))
            .catch(err => console.warn('MongoDB non joignable, fallback local activé:', err.message));
    } catch (e) {
        console.warn('Mongoose non installé ou non requis');
    }
}

// ----------------------------------------------------
// ROUTES API AUTHENTIFICATION PAR MOT DE PASSE
// ----------------------------------------------------
const hashPassword = async (password) => {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(password, salt, 64);
    return `${salt}:${hash.toString('hex')}`;
};

const verifyPassword = async (password, passwordHash) => {
    const [salt, storedHash] = String(passwordHash || '').split(':');
    if (!salt || !storedHash) return false;

    const expected = Buffer.from(storedHash, 'hex');
    const actual = await scryptAsync(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const createAuthResponse = (user) => {
    const { passwordHash, ...publicUser } = user;
    const token = jwt.sign(
        { id: user.id, identifier: user.identifier, name: user.name, role: user.role, authMethod: 'password' },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
    return { success: true, token, user: publicUser };
};

app.post('/api/auth/forgot-password', async (req, res) => {
    const identifier = String(req.body.identifier || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        return res.status(400).json({ error: 'Veuillez renseigner une adresse e-mail valide.' });
    }

    const smtpPort = Number(process.env.SMTP_PORT || 587);
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
        return res.status(503).json({ error: 'La récupération du mot de passe est indisponible. Veuillez réessayer plus tard.' });
    }

    const user = db.users.find(account => account.identifier === identifier);
    if (!user) {
        return res.json({ success: true, message: 'Si cette adresse correspond à un compte, un lien de réinitialisation sera envoyé.' });
    }

    const resetToken = randomBytes(32).toString('hex');
    user.passwordResetTokenHash = createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    saveDatabase(db);

    const resetUrl = new URL('/', publicUrl);
    resetUrl.searchParams.set('resetToken', resetToken);
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: user.identifier,
            subject: 'Réinitialisation de votre mot de passe Imo-SN',
            text: `Vous avez demandé à réinitialiser votre mot de passe Imo-SN. Ouvrez ce lien dans l'heure qui suit : ${resetUrl.toString()}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`
        });
        return res.json({ success: true, message: 'Si cette adresse correspond à un compte, un lien de réinitialisation sera envoyé.' });
    } catch (error) {
        delete user.passwordResetTokenHash;
        delete user.passwordResetExpiresAt;
        saveDatabase(db);
        console.error('Erreur lors de l’envoi du lien de réinitialisation:', error.message);
        return res.status(502).json({ error: 'Impossible d’envoyer l’e-mail de réinitialisation. Veuillez réessayer plus tard.' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const resetToken = typeof req.body.resetToken === 'string' ? req.body.resetToken : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const passwordConfirm = typeof req.body.passwordConfirm === 'string' ? req.body.passwordConfirm : '';

    if (!/^[a-f0-9]{64}$/.test(resetToken)) {
        return res.status(400).json({ error: 'Ce lien de réinitialisation est invalide ou expiré.' });
    }
    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir entre 8 et 128 caractères.' });
    }
    if (password !== passwordConfirm) {
        return res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
    }

    const tokenHash = createHash('sha256').update(resetToken).digest('hex');
    const user = db.users.find(account =>
        account.passwordResetTokenHash === tokenHash &&
        Date.parse(account.passwordResetExpiresAt) > Date.now()
    );
    if (!user) {
        return res.status(400).json({ error: 'Ce lien de réinitialisation est invalide ou expiré.' });
    }

    user.passwordHash = await hashPassword(password);
    delete user.passwordResetTokenHash;
    delete user.passwordResetExpiresAt;
    saveDatabase(db);
    return res.json({ success: true, message: 'Votre mot de passe a été modifié. Vous pouvez vous connecter.' });
});

app.post('/api/auth/register', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const identifier = String(req.body.identifier || '').trim().toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const passwordConfirm = typeof req.body.passwordConfirm === 'string' ? req.body.passwordConfirm : '';

    if (!name || name.length > 100) {
        return res.status(400).json({ error: 'Veuillez renseigner un nom valide (100 caractères maximum).' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        return res.status(400).json({ error: 'Veuillez renseigner une adresse e-mail valide.' });
    }
    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir entre 8 et 128 caractères.' });
    }
    if (password !== passwordConfirm) {
        return res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
    }

    if (db.users.some(user => user.identifier === identifier)) {
        return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
    }

    const user = {
        id: randomUUID(),
        identifier,
        name,
        email: identifier,
        phone: '',
        passwordHash: await hashPassword(password),
        role: 'client',
        createdAt: new Date().toISOString()
    };
    db.users.push(user);
    saveDatabase(db);

    return res.status(201).json(createAuthResponse(user));
});

app.post('/api/auth/login', async (req, res) => {
    const identifier = String(req.body.identifier || '').trim().toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!identifier || !password) {
        return res.status(400).json({ error: 'Adresse e-mail et mot de passe requis.' });
    }

    const user = db.users.find(account => account.identifier === identifier);
    if (!user || !await verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
    }

    return res.json(createAuthResponse(user));
});

// Profil utilisateur connecté
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = db.users.find(account => account.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const { passwordHash, ...publicUser } = user;
    res.json({ user: publicUser });
});

// ----------------------------------------------------
// ROUTES API BIENS IMMOBILIERS & COMPTEUR DE VUES
// ----------------------------------------------------

// 1. Liste des biens avec filtres (type, ville, quartier, prix)
app.get('/api/biens', (req, res) => {
    let list = [...db.properties];
    const { type, location, search, minPrice, maxPrice } = req.query;

    if (type && type !== 'all') {
        list = list.filter(p => p.type === type.toLowerCase());
    }
    if (location && location !== 'all') {
        const loc = location.toLowerCase();
        list = list.filter(p => 
            p.location.toLowerCase().includes(loc) ||
            p.city.toLowerCase().includes(loc) ||
            p.neighborhood.toLowerCase().includes(loc)
        );
    }
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.location.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        );
    }
    if (minPrice) {
        list = list.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice) {
        list = list.filter(p => p.price <= Number(maxPrice));
    }

    res.json(list);
});

// 2. Détail d'un bien
app.get('/api/biens/:id', (req, res) => {
    const property = db.properties.find(p => p.id === req.params.id);
    if (!property) return res.status(404).json({ error: 'Bien non trouvé' });
    res.json(property);
});

// 3. Compteur de vues atomique
app.post('/api/biens/:id/view', (req, res) => {
    const property = db.properties.find(p => p.id === req.params.id);
    if (!property) return res.status(404).json({ error: 'Bien non trouvé' });

    property.views = (property.views || 0) + 1;
    saveDatabase(db);

    // Notification Socket.io pour mise à jour en direct si disponible
    if (io) {
        io.emit('property:view_updated', { propertyId: property.id, views: property.views });
    }

    res.json({ success: true, propertyId: property.id, views: property.views });
});

// ----------------------------------------------------
// ROUTES API MESSAGERIE & HISTORIQUE DE DISCUSSION
// ----------------------------------------------------
app.get('/api/messages/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const history = db.messages.filter(m => m.roomId === roomId);
    res.json(history);
});

app.post('/api/messages', (req, res) => {
    const { roomId, sender, text, voiceUrl, duration } = req.body;
    if (!roomId || (!text && !voiceUrl)) {
        return res.status(400).json({ error: 'Données de message incomplètes' });
    }

    const newMsg = {
        id: randomUUID(),
        roomId,
        sender: sender || 'Visiteur',
        text: text || '',
        voiceUrl: voiceUrl || null,
        duration: duration || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString()
    };

    db.messages.push(newMsg);
    // Limite à 500 messages enregistrés en mémoire
    if (db.messages.length > 500) db.messages.shift();
    saveDatabase(db);

    if (io) {
        io.to(roomId).emit('chat:new_message', newMsg);
    }

    res.json(newMsg);
});

// ----------------------------------------------------
// GESTION TEMPS RÉEL SOCKET.IO (CHAT, VOCAL & APPEL AUDIO)
// ----------------------------------------------------
if (io) {
    io.on('connection', socket => {
        console.log(`[SOCKET] Nouveau client connecté: ${socket.id}`);

        // Rejoindre une room de discussion (ex: liée à une propriété ou bailleur)
        socket.on('chat:join', roomId => {
            socket.join(roomId);
            console.log(`Client ${socket.id} a rejoint la salle : ${roomId}`);
        });

        // Message texte en temps réel
        socket.on('chat:send_message', data => {
            const { roomId, text, sender } = data;
            const messageObj = {
                id: randomUUID(),
                roomId,
                sender: sender || 'Utilisateur',
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toISOString()
            };
            db.messages.push(messageObj);
            saveDatabase(db);
            io.to(roomId).emit('chat:new_message', messageObj);
        });

        // Message vocal en temps réel
        socket.on('chat:send_voice', data => {
            const { roomId, audioData, duration, sender } = data;
            const voiceMsg = {
                id: randomUUID(),
                roomId,
                sender: sender || 'Utilisateur',
                voiceUrl: audioData, // Base64 audio string
                duration: duration || '0:05',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toISOString()
            };
            db.messages.push(voiceMsg);
            saveDatabase(db);
            io.to(roomId).emit('chat:new_message', voiceMsg);
        });

        // Signalisation Appel Audio
        socket.on('call:start', data => {
            const { roomId, callerName, propertyTitle } = data;
            socket.to(roomId).emit('call:incoming', {
                callerId: socket.id,
                callerName,
                propertyTitle
            });
        });

        socket.on('call:answer', data => {
            io.to(data.callerId).emit('call:accepted', { peerId: socket.id });
        });

        socket.on('call:end', data => {
            io.to(data.roomId).emit('call:terminated');
        });

        socket.on('disconnect', () => {
            console.log(`Client déconnecté: ${socket.id}`);
        });
    });
}

// ----------------------------------------------------
// PAIEMENTS PAYDUNYA (CONSERVATION INTEGRATION)
// ----------------------------------------------------
const subscriptionAmount = 10000;
const subscriptionInterval = 'month';
const recipient = '+221789846529';

async function createInvoice(data) {
    const required = ['PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY', 'PAYDUNYA_TOKEN'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
    const amount = data.kind === 'video' ? 300 : subscriptionAmount;

    const response = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
            'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
            'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
            'PAYDUNYA-MODE': process.env.PAYDUNYA_MODE || 'test'
        },
        body: JSON.stringify({
            invoice: {
                total_amount: amount,
                description: data.kind === 'video'
                    ? 'Publication vidéo Imo-SN - 300 FCFA'
                    : 'Abonnement mensuel Imo-SN - 10 000 FCFA',
                customer: {
                    name: String(data.name || '').slice(0, 100),
                    email: String(data.email || '').slice(0, 150),
                    phone: String(data.phone || '').slice(0, 30)
                }
            },
            store: {
                name: 'Imo-SN',
                tagline: 'Abonnement bailleur',
                phone_number: recipient,
                website_url: publicUrl
            },
            actions: {
                callback_url: `${publicUrl}/api/paydunya/callback`,
                return_url: `${publicUrl}/?payment=success`,
                cancel_url: `${publicUrl}/?payment=cancelled`
            },
            custom_data: {
                payment_id: randomUUID(),
                recipient,
                amount,
                interval: subscriptionInterval
            }
        })
    });
    const result = await response.json();
    if (!response.ok || result.response_code !== '00' || !result.invoice_url) {
        throw new Error(result.response_text || 'PayDunya invoice creation failed');
    }
    return { invoiceUrl: result.invoice_url, token: result.token };
}

app.post('/api/payments', async (req, res) => {
    try {
        const data = req.body;
        if (!data.email || !data.phone || !data.method || !['wave', 'orange'].includes(data.method)) {
            return res.status(400).json({ error: 'Informations de paiement invalides.' });
        }
        res.json(await createInvoice(data));
    } catch (error) {
        res.status(502).json({ error: error.message });
    }
});

app.post('/api/paydunya/callback', (req, res) => {
    res.json({ received: true });
});

// Config frontend injectée
app.get('/config.js', (req, res) => {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(`window.__API_BASE_URL__ = ${JSON.stringify(process.env.API_BASE_URL || publicUrl || '')};`);
});

// Health check pour Render
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Fichiers statiques (HTML, CSS, JS, Assets)
app.use(express.static(root, {
    maxAge: '1h',
    setHeaders: (res, path) => {
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Route par défaut (SPA / HTML fallback)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint non trouvé' });
    }
    res.sendFile(path.join(root, 'index.html'));
});

// Démarrage du serveur
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Imo-SN démarré avec succès sur le port ${PORT}`);
    console.log(`URL publique: ${publicUrl}`);
});
