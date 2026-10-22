/* ==========================================================
   IMO-SN — JAVASCRIPT COMPLET & INTERACTIONS MODERNES
   - Gestion Thème Sombre / Clair
   - Navigation Mobile Fluide & Backdrop
    - Authentification sécurisée par e-mail et mot de passe
   - Compteur de Vues Dynamique & Catalogue Biens
   - Espace de Communication : Chat Temps Réel, Vocaux & Appels
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const API_BASE = (window.__API_BASE_URL__ || '').replace(/\/+$/, '');

    /* ==========================================================
       1. GESTION DU THÈME (SOMBRE / CLAIR)
       ========================================================== */
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('imoSnTheme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const applyTheme = (theme, notify = false) => {
        const isDark = theme === 'dark';
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        localStorage.setItem('imoSnTheme', isDark ? 'dark' : 'light');

        if (themeToggle) {
            themeToggle.setAttribute('aria-label', isDark ? 'Activer le mode clair' : 'Activer le mode sombre');
            themeToggle.setAttribute('title', isDark ? 'Activer le mode clair' : 'Activer le mode sombre');
            themeToggle.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
        }

        if (notify) {
            showToast(isDark ? 'Mode sombre activé 🌙' : 'Mode clair activé ☀️');
        }
    };

    applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'), false);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.dataset.theme;
            applyTheme(current === 'dark' ? 'light' : 'dark', true);
        });
    }

    /* ==========================================================
       2. NAVIGATION MOBILE & MENU DÉROULANT FLUIDE
       ========================================================== */
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const navBackdrop = document.getElementById('navBackdrop');
    const navbar = document.getElementById('navbar');

    const toggleMobileMenu = (open) => {
        const isOpen = open !== undefined ? open : !navLinks.classList.contains('active');
        if (navToggle) {
            navToggle.classList.toggle('active', isOpen);
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        if (navLinks) {
            navLinks.classList.toggle('active', isOpen);
        }
        if (navBackdrop) {
            navBackdrop.classList.toggle('active', isOpen);
        }
        document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    if (navToggle) {
        navToggle.addEventListener('click', () => toggleMobileMenu());
    }

    if (navBackdrop) {
        navBackdrop.addEventListener('click', () => toggleMobileMenu(false));
    }

    // Fermeture automatique lors du clic sur un lien du menu
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) toggleMobileMenu(false);
            });
        });
    }

    // Effet navbar sticky au scroll
    window.addEventListener('scroll', () => {
        if (navbar && !navbar.classList.contains('always-scrolled')) {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else if (!window.location.pathname.includes('biens.html')) {
                navbar.classList.remove('scrolled');
            }
        }
    });

    /* ==========================================================
       3. AUTHENTIFICATION PAR E-MAIL ET MOT DE PASSE
       ========================================================== */
    const authGate = document.getElementById('authGate');
    const authAlert = document.getElementById('authAlert');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authModeLoginBtn = document.getElementById('authModeLoginBtn');
    const authModeSignupBtn = document.getElementById('authModeSignupBtn');
    const authFullNameGroup = document.getElementById('authFullNameGroup');
    const authFullNameInput = document.getElementById('authFullName');
    const authForm = document.getElementById('authForm');
    const authPasswordLabel = document.getElementById('authPasswordLabel');
    const authPasswordInput = document.getElementById('authPassword');
    const authPasswordConfirmGroup = document.getElementById('authPasswordConfirmGroup');
    const authPasswordConfirmInput = document.getElementById('authPasswordConfirm');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const userProfileBadge = document.getElementById('userProfileBadge');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');

    let currentAuthMode = 'login';

    const setAlert = (msg, type = 'error') => {
        if (!authAlert) return;
        if (!msg) {
            authAlert.style.display = 'none';
            authAlert.textContent = '';
            return;
        }
        authAlert.className = `auth-alert ${type}`;
        authAlert.innerHTML = `<i class="fas fa-${type === 'error' ? 'circle-exclamation' : 'circle-check'}"></i> <span>${msg}</span>`;
        authAlert.style.display = 'flex';
    };

    const readApiResponse = async (response) => {
        const body = await response.text();
        const isAuthEndpointUnavailable = response.status === 404 || response.status === 405;
        const endpointUnavailableMessage = 'Le serveur de connexion n’est pas à jour. Redéployez la nouvelle version de l’API.';
        if (!body.trim()) {
            if (isAuthEndpointUnavailable) throw new Error(endpointUnavailableMessage);
            throw new Error(`Le serveur n’a pas renvoyé de réponse (HTTP ${response.status}).`);
        }

        let result;
        try {
            result = JSON.parse(body);
        } catch {
            if (isAuthEndpointUnavailable) throw new Error(endpointUnavailableMessage);
            throw new Error(`Réponse invalide du serveur (HTTP ${response.status}).`);
        }

        if (!response.ok) {
            if (isAuthEndpointUnavailable) throw new Error(endpointUnavailableMessage);
            throw new Error(result.error || `Erreur serveur (HTTP ${response.status}).`);
        }
        return result;
    };

    const setAuthMode = (mode) => {
        currentAuthMode = mode;
        const isSignup = mode === 'signup';

        if (authModeLoginBtn) {
            authModeLoginBtn.classList.toggle('active', !isSignup);
            authModeLoginBtn.setAttribute('aria-pressed', String(!isSignup));
        }
        if (authModeSignupBtn) {
            authModeSignupBtn.classList.toggle('active', isSignup);
            authModeSignupBtn.setAttribute('aria-pressed', String(isSignup));
        }
        if (authFullNameGroup) authFullNameGroup.style.display = isSignup ? 'flex' : 'none';
        if (authFullNameInput) authFullNameInput.required = isSignup;
        if (authTitle) authTitle.textContent = isSignup ? 'S’inscrire' : 'Se connecter';
        if (authPasswordLabel) authPasswordLabel.textContent = isSignup ? 'Créer un mot de passe' : 'Mot de passe';
        if (authPasswordInput) authPasswordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
        if (authPasswordConfirmGroup) authPasswordConfirmGroup.style.display = isSignup ? 'flex' : 'none';
        if (authPasswordConfirmInput) authPasswordConfirmInput.required = isSignup;
        if (authSubtitle) {
            authSubtitle.textContent = isSignup
                ? 'Créez votre compte avec une adresse e-mail et un mot de passe.'
                : 'Connectez-vous avec votre adresse e-mail et votre mot de passe.';
        }
        if (authSubmitBtn) {
            authSubmitBtn.innerHTML = `<span>${isSignup ? 'Créer mon compte' : 'Se connecter'}</span> <i class="fas fa-${isSignup ? 'user-plus' : 'right-to-bracket'}"></i>`;
        }
        setAlert(null);
    };

    if (authModeLoginBtn) authModeLoginBtn.addEventListener('click', () => setAuthMode('login'));
    if (authModeSignupBtn) authModeSignupBtn.addEventListener('click', () => setAuthMode('signup'));
    setAuthMode('login');

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setAlert(null);

            const name = authFullNameInput?.value.trim() || '';
            const identifier = document.getElementById('authEmailInput')?.value.trim().toLowerCase() || '';
            const password = authPasswordInput?.value || '';
            const passwordConfirm = authPasswordConfirmInput?.value || '';

            if (!identifier || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
                return setAlert('Veuillez renseigner une adresse e-mail valide.');
            }
            if (password.length < 8) {
                return setAlert('Le mot de passe doit contenir au moins 8 caractères.');
            }
            if (currentAuthMode === 'signup' && !name) {
                return setAlert('Veuillez renseigner votre nom complet.');
            }
            if (currentAuthMode === 'signup' && password !== passwordConfirm) {
                return setAlert('Les mots de passe ne correspondent pas.');
            }

            authSubmitBtn.disabled = true;
            authSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Veuillez patienter...';

            try {
                const endpoint = currentAuthMode === 'signup' ? '/api/auth/register' : '/api/auth/login';
                const payload = currentAuthMode === 'signup'
                    ? { name, identifier, password, passwordConfirm }
                    : { identifier, password };
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await readApiResponse(response);
                if (!result.user || !result.token) {
                    throw new Error('La réponse du serveur est incomplète. Réessayez plus tard.');
                }

                localStorage.setItem('imoAuthUser', JSON.stringify(result.user));
                localStorage.setItem('imoAuthToken', result.token);
                unlockPlatform(result.user);
                showToast(`Bienvenue sur Imo-SN, ${result.user.name} !`);
            } catch (err) {
                setAlert(err.message || 'Impossible de joindre le serveur. Réessayez plus tard.');
            } finally {
                authSubmitBtn.disabled = false;
                authSubmitBtn.innerHTML = `<span>${currentAuthMode === 'signup' ? 'Créer mon compte' : 'Se connecter'}</span> <i class="fas fa-${currentAuthMode === 'signup' ? 'user-plus' : 'right-to-bracket'}"></i>`;
            }
        });
    }

    // Déverrouillage de la plateforme
    function unlockPlatform(user) {
        document.body.classList.remove('auth-locked');
        if (authGate) {
            authGate.classList.add('auth-unlocked');
            setTimeout(() => { authGate.style.display = 'none'; }, 450);
        }
        if (userProfileBadge) {
            userProfileBadge.style.display = 'inline-flex';
            if (userName) userName.textContent = user.name || 'Utilisateur';
            if (userAvatar) userAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();
        }
    }

    // Déconnexion
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('imoAuthUser');
            localStorage.removeItem('imoAuthToken');
            showToast('Déconnexion effectuée');
            setTimeout(() => { window.location.reload(); }, 600);
        });
    }

    // Restaurer uniquement les sessions créées par l'authentification par mot de passe
    const savedToken = localStorage.getItem('imoAuthToken');
    if (savedToken) {
        document.body.classList.add('auth-locked');
        fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
        })
            .then(async response => {
                const result = await readApiResponse(response);
                if (!result.user) throw new Error('Réponse de session invalide.');
                localStorage.setItem('imoAuthUser', JSON.stringify(result.user));
                unlockPlatform(result.user);
            })
            .catch(() => {
                localStorage.removeItem('imoAuthUser');
                localStorage.removeItem('imoAuthToken');
            });
    } else if (authGate) {
        localStorage.removeItem('imoAuthUser');
        document.body.classList.add('auth-locked');
    }

    /* ==========================================================
       5. GESTION DES BIENS & COMPTEUR DE VUES EN TEMPS RÉEL
       ========================================================== */
    const PROPERTIES_DATA = [
        {
            id: "1",
            title: "Villa Moderne de Luxe",
            type: "vente",
            category: "Villa",
            price: "185 000 000 FCFA",
            location: "Almadies, Dakar",
            city: "Dakar",
            bedrooms: 5,
            bathrooms: 3,
            area: 450,
            views: 342,
            image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=550&fit=crop&q=80",
            description: "Superbe villa contemporaine située dans le quartier résidentiel et sécurisé des Almadies. Finitions haut de gamme, piscine privée, grand jardin paysager, cuisine équipée et groupe électrogène.",
            landlord: {
                name: "Cheikh Fall",
                company: "Imo-SN Prestige",
                phone: "+221 78 984 65 29",
                email: "contact@imo-sn.com",
                address: "Route des Almadies, Dakar"
            }
        },
        {
            id: "2",
            title: "Appartement Meublé Standing",
            type: "location",
            category: "Appartement",
            price: "750 000 FCFA/mois",
            location: "Plateau, Dakar",
            city: "Dakar",
            bedrooms: 3,
            bathrooms: 2,
            area: 180,
            views: 512,
            image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=550&fit=crop&q=80",
            description: "Appartement meublé avec goût en plein centre-ville au Plateau. Vue dégagée, sécurité 24h/24, ascenseur, fibre optique et parking sous-sol inclus.",
            landlord: {
                name: "Fatou Sow",
                company: "Dakar Habitat",
                phone: "+221 77 555 44 33",
                email: "f.sow@dakar-habitat.sn",
                address: "Avenue Roume, Dakar Plateau"
            }
        },
        {
            id: "3",
            title: "Villa Balnéaire avec Piscine",
            type: "vente",
            category: "Villa",
            price: "120 000 000 FCFA",
            location: "Saly, Mbour",
            city: "Mbour",
            bedrooms: 4,
            bathrooms: 3,
            area: 380,
            views: 289,
            image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=550&fit=crop&q=80",
            description: "Magnifique propriété à 5 minutes de la plage de Saly. Grande piscine lagon, terrasse couverte, salon spacieux et dépendance gardien.",
            landlord: {
                name: "Mamadou Diop",
                company: "Saly Immo Conseil",
                phone: "+221 77 111 22 33",
                email: "m.diop@salyimmo.sn",
                address: "Boulevard Maritime, Saly"
            }
        },
        {
            id: "4",
            title: "Terrain Viabilisé & Titre Foncier",
            type: "vente",
            category: "Terrain",
            price: "25 000 000 FCFA",
            location: "Diamniadio, Dakar",
            city: "Dakar",
            bedrooms: 0,
            bathrooms: 0,
            area: 500,
            views: 198,
            image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=550&fit=crop&q=80",
            description: "Parcelle viabilisée (eau, électricité, assainissement) avec Titre Foncier individuel. Emplacement stratégique à proximité des ministères et du TER.",
            landlord: {
                name: "Amath Ba",
                company: "Terrains du Cap",
                phone: "+221 76 444 55 66",
                email: "terrains@cap-senegal.com",
                address: "Pôle Urbain de Diamniadio"
            }
        },
        {
            id: "5",
            title: "Duplex Haut Standing",
            type: "location",
            category: "Duplex",
            price: "1 200 000 FCFA/mois",
            location: "Mermoz, Dakar",
            city: "Dakar",
            bedrooms: 4,
            bathrooms: 3,
            area: 300,
            views: 430,
            image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=550&fit=crop&q=80",
            description: "Duplex spacieux et très lumineux à Mermoz. Quartier calme, double salon, suite parentale avec dressing, climatisation intégrale et groupe électrogène.",
            landlord: {
                name: "Cheikh Fall",
                company: "Imo-SN Prestige",
                phone: "+221 78 984 65 29",
                email: "contact@imo-sn.com",
                address: "Route des Almadies, Dakar"
            }
        },
        {
            id: "6",
            title: "Appartement Vue Mer Panoramique",
            type: "vente",
            category: "Appartement",
            price: "65 000 000 FCFA",
            location: "Ngor, Dakar",
            city: "Dakar",
            bedrooms: 3,
            bathrooms: 2,
            area: 200,
            views: 671,
            image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=550&fit=crop&q=80",
            description: "Appartement avec balcon terrasse offrant une vue imprenable sur l'île de Ngor et le coucher de soleil. Résidence récente avec ascenseur.",
            landlord: {
                name: "Aminata Diallo",
                company: "Prestige Immo Dakar",
                phone: "+221 70 999 88 77",
                email: "aminata@prestigeimmo.sn",
                address: "Corniche Ouest, Ngor"
            }
        }
    ];

    const SAMPLE_RATINGS = [
        { rating: '4,8', reviews: 18 },
        { rating: '4,6', reviews: 12 },
        { rating: '4,9', reviews: 24 },
        { rating: '4,5', reviews: 9 },
        { rating: '4,7', reviews: 15 },
        { rating: '4,8', reviews: 21 }
    ];
    PROPERTIES_DATA.forEach((property, index) => Object.assign(property, SAMPLE_RATINGS[index]));

    const getWhatsAppUrl = (property) => {
        const phone = property.landlord.phone.replace(/\D/g, '');
        const message = `Bonjour ${property.landlord.name}, je vous contacte au sujet de « ${property.title} ». Est-il possible d'organiser une visite vidéo ?`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    };

    const getMapUrl = (property) => {
        const address = `${property.landlord.address}, Sénégal`;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    };

    // Récupérer les vues locales si sauvegardées
    const localViews = JSON.parse(localStorage.getItem('imoPropertyViews') || '{}');
    PROPERTIES_DATA.forEach(p => {
        if (localViews[p.id]) p.views = localViews[p.id];
    });

    // Incrémentation du compteur de vues
    async function incrementPropertyViews(propId) {
        const prop = PROPERTIES_DATA.find(p => p.id === String(propId));
        if (!prop) return;

        prop.views = (prop.views || 0) + 1;
        localViews[propId] = prop.views;
        localStorage.setItem('imoPropertyViews', JSON.stringify(localViews));

        // Mettre à jour l'affichage sur la page
        document.querySelectorAll(`.property-views-badge[data-property-id="${propId}"] .view-count-val`).forEach(el => {
            el.textContent = prop.views;
        });

        // Appel API backend
        try {
            fetch(`${API_BASE}/api/biens/${propId}/view`, { method: 'POST' }).catch(() => { });
        } catch (e) { }
    }

    // Modal Détail Propriété
    const propertyModal = document.getElementById('propertyModal');
    const modalClose = document.getElementById('modalClose');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalPropertyImg = document.getElementById('modalPropertyImg');
    const modalPropertyBadge = document.getElementById('modalPropertyBadge');
    const modalPropertyTitle = document.getElementById('modalPropertyTitle');
    const modalPropertyLocation = document.getElementById('modalPropertyLocation');
    const modalPropertyPrice = document.getElementById('modalPropertyPrice');
    const modalViewsCount = document.getElementById('modalViewsCount');
    const modalPropertyFeatures = document.getElementById('modalPropertyFeatures');
    const modalPropertyDesc = document.getElementById('modalPropertyDesc');
    const modalLandlordName = document.getElementById('modalLandlordName');
    const modalLandlordCompany = document.getElementById('modalLandlordCompany');
    const modalLandlordPhone = document.getElementById('modalLandlordPhone');
    const modalLandlordAddress = document.getElementById('modalLandlordAddress');
    const modalTrustRow = document.getElementById('modalTrustRow');
    const modalWhatsAppBtn = document.getElementById('modalWhatsAppBtn');
    const modalMapBtn = document.getElementById('modalMapBtn');
    const modalCallAgentBtn = document.getElementById('modalCallAgentBtn');
    const modalChatBtn = document.getElementById('modalChatBtn');
    let currentSelectedProperty = null;

    function openPropertyModal(propId) {
        const prop = PROPERTIES_DATA.find(p => p.id === String(propId));
        if (!prop || !propertyModal) return;

        currentSelectedProperty = prop;
        incrementPropertyViews(propId);

        if (modalPropertyImg) modalPropertyImg.src = prop.image;
        if (modalPropertyBadge) {
            modalPropertyBadge.textContent = prop.type === 'vente' ? 'À vendre' : 'À louer';
            modalPropertyBadge.className = `modal-badge property-badge--${prop.type}`;
        }
        if (modalPropertyTitle) modalPropertyTitle.textContent = prop.title;
        if (modalPropertyLocation) modalPropertyLocation.innerHTML = `<i class="fas fa-location-dot"></i> ${prop.location}`;
        if (modalPropertyPrice) modalPropertyPrice.textContent = prop.price;
        if (modalViewsCount) modalViewsCount.textContent = prop.views;
        if (modalPropertyDesc) modalPropertyDesc.textContent = prop.description;

        if (modalPropertyFeatures) {
            modalPropertyFeatures.innerHTML = `
                ${prop.bedrooms ? `<span><i class="fas fa-bed"></i> ${prop.bedrooms} Chambres</span>` : ''}
                ${prop.bathrooms ? `<span><i class="fas fa-bath"></i> ${prop.bathrooms} SdB</span>` : ''}
                <span><i class="fas fa-ruler-combined"></i> ${prop.area} m²</span>
                <span><i class="fas fa-file-circle-question"></i> Documents à vérifier</span>
            `;
        }

        if (modalLandlordName) modalLandlordName.innerHTML = `<i class="fas fa-circle-user"></i> ${prop.landlord.name}`;
        if (modalLandlordCompany) modalLandlordCompany.textContent = prop.landlord.company;
        if (modalLandlordPhone) modalLandlordPhone.innerHTML = `<i class="fas fa-phone"></i> ${prop.landlord.phone}`;
        if (modalLandlordAddress) modalLandlordAddress.innerHTML = `<i class="fas fa-location-dot"></i> ${prop.landlord.address}`;
        if (modalTrustRow) modalTrustRow.innerHTML = `<span class="listing-rating"><i class="fas fa-star"></i> ${prop.rating} <small>note démo · ${prop.reviews} avis</small></span><span class="landlord-pending"><i class="fas fa-circle-exclamation"></i> Profil à vérifier</span>`;
        if (modalWhatsAppBtn) modalWhatsAppBtn.href = getWhatsAppUrl(prop);
        if (modalMapBtn) modalMapBtn.href = getMapUrl(prop);
        if (modalCallAgentBtn) modalCallAgentBtn.href = `tel:${prop.landlord.phone.replace(/\s/g, '')}`;

        propertyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closePropertyModal() {
        if (propertyModal) {
            propertyModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (modalClose) modalClose.addEventListener('click', closePropertyModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closePropertyModal);

    // Écouteurs pour ouvrir les détails des biens
    document.addEventListener('click', (e) => {
        const detailBtn = e.target.closest('.property-cta');
        if (detailBtn) {
            const id = detailBtn.dataset.propertyId;
            if (id) openPropertyModal(id);
        }

        const contactBtn = e.target.closest('.btn-contact-landlord');
        if (contactBtn) {
            const id = contactBtn.dataset.propertyId;
            const prop = PROPERTIES_DATA.find(p => p.id === String(id));
            openChatWithLandlord(prop);
        }
    });

    if (modalChatBtn) {
        modalChatBtn.addEventListener('click', () => {
            closePropertyModal();
            if (currentSelectedProperty) openChatWithLandlord(currentSelectedProperty);
        });
    }

    /* Rendu des biens sur la page dédiée biens.html */
    const biensGridContainer = document.getElementById('biensGridContainer');
    function renderBiensGrid(list = PROPERTIES_DATA) {
        if (!biensGridContainer) return;

        const countEl = document.getElementById('resultsCount');
        if (countEl) countEl.textContent = list.length;

        if (list.length === 0) {
            biensGridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px solid var(--border-light);">
                    <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px;"></i>
                    <h3 style="font-size: 1.3rem; margin-bottom: 8px;">Aucune propriété ne correspond à votre recherche</h3>
                    <p style="color: var(--text-muted);">Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.</p>
                </div>
            `;
            return;
        }

        biensGridContainer.innerHTML = list.map(p => `
            <div class="property-card" data-type="${p.type}" data-location="${p.location.toLowerCase()}">
                <div class="property-image">
                    <img src="${p.image}" alt="${p.title}" loading="lazy">
                    <span class="property-badge property-badge--${p.type}">${p.type === 'vente' ? 'À vendre' : 'À louer'}</span>
                    <span class="property-views-badge" data-property-id="${p.id}">
                        <i class="fas fa-eye"></i> <span class="view-count-val">${p.views}</span> vues
                    </span>
                    <div class="property-price">${p.price}</div>
                    <button class="property-favorite" aria-label="Favoris"><i class="far fa-heart"></i></button>
                </div>
                <div class="property-info">
                    <h3 class="property-title">${p.title}</h3>
                    <p class="property-location"><i class="fas fa-location-dot"></i> ${p.location}</p>
                    <div class="property-features">
                        ${p.bedrooms ? `<span><i class="fas fa-bed"></i> ${p.bedrooms} Ch.</span>` : ''}
                        ${p.bathrooms ? `<span><i class="fas fa-bath"></i> ${p.bathrooms} SdB</span>` : ''}
                        <span><i class="fas fa-ruler-combined"></i> ${p.area} m²</span>
                    </div>

                    <!-- Fiche Bailleur -->
                    <div class="property-landlord-box">
                        <div class="landlord-row">
                            <span class="landlord-name"><i class="fas fa-circle-user"></i> ${p.landlord.name}</span>
                            <span class="landlord-company">${p.landlord.company}</span>
                        </div>
                        <div class="landlord-detail-row">
                            <span><i class="fas fa-phone"></i> ${p.landlord.phone}</span>
                            <span><i class="fas fa-location-dot"></i> ${p.landlord.address}</span>
                        </div>
                        <div class="listing-trust-row">
                            <span class="listing-rating"><i class="fas fa-star"></i> ${p.rating} <small>note démo · ${p.reviews} avis</small></span>
                            <span class="landlord-pending"><i class="fas fa-circle-exclamation"></i> Profil à vérifier</span>
                        </div>
                        <div class="listing-contact-links">
                            <a class="btn-whatsapp" href="${getWhatsAppUrl(p)}" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp"></i> Demander une visite vidéo</a>
                            <a class="btn-map" href="${getMapUrl(p)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-map-location-dot"></i> Carte</a>
                        </div>
                    </div>

                    <div class="property-footer" style="flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span class="property-type"><i class="fas fa-home"></i> ${p.category}</span>
                            <button type="button" class="property-cta" data-property-id="${p.id}">Voir détails <i class="fas fa-arrow-right"></i></button>
                        </div>
                        <button type="button" class="btn-contact-landlord" data-property-id="${p.id}">
                            <i class="fas fa-comment-dots"></i> Contacter le bailleur
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function enhanceStaticListingCards() {
        document.querySelectorAll('.properties-grid .property-card').forEach((card) => {
            const propertyId = card.querySelector('.property-cta')?.dataset.propertyId;
            const property = PROPERTIES_DATA.find((item) => item.id === propertyId);
            const landlordBox = card.querySelector('.property-landlord-box');
            if (!property || !landlordBox) return;

            landlordBox.querySelector('.landlord-verified')?.remove();
            const trustRow = document.createElement('div');
            trustRow.className = 'listing-trust-row';
            trustRow.innerHTML = `<span class="listing-rating"><i class="fas fa-star"></i> ${property.rating} <small>note démo · ${property.reviews} avis</small></span><span class="landlord-pending"><i class="fas fa-circle-exclamation"></i> Profil à vérifier</span>`;
            const contactLinks = document.createElement('div');
            contactLinks.className = 'listing-contact-links';
            contactLinks.innerHTML = `<a class="btn-whatsapp" href="${getWhatsAppUrl(property)}" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp"></i> Demander une visite vidéo</a><a class="btn-map" href="${getMapUrl(property)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-map-location-dot"></i> Carte</a>`;
            landlordBox.append(trustRow, contactLinks);
        });
    }

    if (!biensGridContainer) enhanceStaticListingCards();

    if (biensGridContainer) {
        renderBiensGrid();

        // Filtres de recherche sur biens.html
        const searchInput = document.getElementById('biensSearchInput');
        const typeSelect = document.getElementById('biensTypeSelect');
        const locSelect = document.getElementById('biensLocationSelect');
        const filterBtn = document.getElementById('applyFiltersBtn');

        const runBiensFilter = () => {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const typeVal = typeSelect ? typeSelect.value : 'all';
            const locVal = locSelect ? locSelect.value : 'all';

            let filtered = PROPERTIES_DATA.filter(p => {
                const matchType = (typeVal === 'all') || (p.type === typeVal);
                const matchLoc = (locVal === 'all') || p.location.toLowerCase().includes(locVal);
                const matchSearch = !query ||
                    p.title.toLowerCase().includes(query) ||
                    p.location.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query) ||
                    p.category.toLowerCase().includes(query);
                return matchType && matchLoc && matchSearch;
            });
            renderBiensGrid(filtered);
        };

        if (filterBtn) filterBtn.addEventListener('click', runBiensFilter);
        if (searchInput) searchInput.addEventListener('input', runBiensFilter);
        if (typeSelect) typeSelect.addEventListener('change', runBiensFilter);
        if (locSelect) locSelect.addEventListener('change', runBiensFilter);
    }

    // Filtres Vente / Location sur index.html et biens.html
    document.querySelectorAll('.property-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.property-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;

            if (biensGridContainer) {
                const filtered = filter === 'all' ? PROPERTIES_DATA : PROPERTIES_DATA.filter(p => p.type === filter);
                renderBiensGrid(filtered);
            } else {
                document.querySelectorAll('.properties-grid .property-card').forEach(card => {
                    if (filter === 'all' || card.dataset.type === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        });
    });

    /* ==========================================================
       6. SYSTÈME DE COMMUNICATION EN TEMPS RÉEL
          - Chat Texte (WebSocket / Socket.io)
          - Messages Vocaux (MediaRecorder Web Audio)
          - Appel Audio en direct (Signalisation & Synthèse Web Audio)
       ========================================================== */
    const chatLauncherBtn = document.getElementById('chatLauncherBtn');
    const imoChatWindow = document.getElementById('imoChatWindow');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatTextInput = document.getElementById('chatTextInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatMessagesBody = document.getElementById('chatMessagesBody');
    const voiceRecordBtn = document.getElementById('voiceRecordBtn');
    const recordingStatusBar = document.getElementById('recordingStatusBar');
    const voiceRecordTimer = document.getElementById('voiceRecordTimer');
    const cancelVoiceRecordBtn = document.getElementById('cancelVoiceRecordBtn');
    const startCallFromChatBtn = document.getElementById('startCallFromChatBtn');
    const chatPartnerName = document.getElementById('chatPartnerName');
    const chatPartnerAvatar = document.getElementById('chatPartnerAvatar');
    const chatPropertyContext = document.getElementById('chatPropertyContext');
    const chatPropertyTitleContext = document.getElementById('chatPropertyTitleContext');
    const navChatLink = document.getElementById('navChatLink');
    const ctaChatBtn = document.getElementById('ctaChatBtn');

    // Connexion Socket.io avec fallback
    let socket = null;
    if (typeof io !== 'undefined') {
        try {
            socket = io(API_BASE || undefined);
            socket.on('connect', () => console.log('Connecté au serveur de chat temps réel'));
            socket.on('chat:new_message', (msg) => {
                appendChatMessage(msg.sender, msg.text, msg.voiceUrl, msg.duration, false);
            });
        } catch (e) {
            console.warn('Socket connection fallback activé');
        }
    }

    const openChat = () => {
        if (imoChatWindow) {
            imoChatWindow.classList.add('active');
            if (chatTextInput) chatTextInput.focus();
        }
    };

    const closeChat = () => {
        if (imoChatWindow) imoChatWindow.classList.remove('active');
    };

    if (chatLauncherBtn) chatLauncherBtn.addEventListener('click', openChat);
    if (closeChatBtn) closeChatBtn.addEventListener('click', closeChat);
    if (navChatLink) navChatLink.addEventListener('click', (e) => { e.preventDefault(); openChat(); });
    if (ctaChatBtn) ctaChatBtn.addEventListener('click', (e) => { e.preventDefault(); openChat(); });

    function openChatWithLandlord(property) {
        openChat();
        if (property && property.landlord) {
            if (chatPartnerName) chatPartnerName.textContent = `${property.landlord.name} (${property.landlord.company})`;
            if (chatPartnerAvatar) {
                const initials = property.landlord.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                chatPartnerAvatar.innerHTML = `<span>${initials}</span><span class="status-indicator"></span>`;
            }
            if (chatPropertyContext && chatPropertyTitleContext) {
                chatPropertyTitleContext.textContent = `${property.title} • ${property.price}`;
                chatPropertyContext.style.display = 'flex';
            }
        }
    }

    // Ajout d'un message dans la vue
    function appendChatMessage(sender, text, voiceUrl = null, duration = null, isMe = true) {
        if (!chatMessagesBody) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isMe ? 'sent' : 'received'}`;

        if (voiceUrl) {
            bubble.innerHTML = `
                <div class="voice-msg-player">
                    <button type="button" class="voice-play-btn"><i class="fas fa-play"></i></button>
                    <div class="voice-waveform-bar">
                        <div class="voice-waveform-progress"></div>
                    </div>
                    <span class="voice-duration">${duration || '0:05'}</span>
                    <audio src="${voiceUrl}" preload="none" style="display:none;"></audio>
                </div>
                <span class="chat-bubble-time">${time}</span>
            `;

            // Gestion de lecture audio
            const playBtn = bubble.querySelector('.voice-play-btn');
            const audioEl = bubble.querySelector('audio');
            const progress = bubble.querySelector('.voice-waveform-progress');

            playBtn.addEventListener('click', () => {
                if (audioEl.paused) {
                    audioEl.play();
                    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    audioEl.pause();
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            });

            audioEl.addEventListener('timeupdate', () => {
                if (audioEl.duration) {
                    const pct = (audioEl.currentTime / audioEl.duration) * 100;
                    progress.style.width = pct + '%';
                }
            });

            audioEl.addEventListener('ended', () => {
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
                progress.style.width = '0%';
            });

        } else {
            bubble.innerHTML = `
                ${text}
                <span class="chat-bubble-time">${time}</span>
            `;
        }

        chatMessagesBody.appendChild(bubble);
        chatMessagesBody.scrollTop = chatMessagesBody.scrollHeight;
    }

    // Envoi de message texte
    const handleSendTextMessage = () => {
        const text = chatTextInput ? chatTextInput.value.trim() : '';
        if (!text) return;

        const currentUser = JSON.parse(localStorage.getItem('imoAuthUser') || '{}');
        const senderName = currentUser.name || 'Visiteur';

        appendChatMessage(senderName, text, null, null, true);
        if (chatTextInput) chatTextInput.value = '';

        if (socket && socket.connected) {
            socket.emit('chat:send_message', {
                roomId: 'general-property',
                text,
                sender: senderName
            });
        } else {
            // Réponse automatique simulée du bailleur après 1.2s
            setTimeout(() => {
                appendChatMessage('Bailleur Imo-SN', 'Merci pour votre message ! Je suis disponible pour vous faire visiter le bien. Souhaitez-vous planifier une date ?', null, null, false);
            }, 1200);
        }
    };

    if (sendMessageBtn) sendMessageBtn.addEventListener('click', handleSendTextMessage);
    if (chatTextInput) {
        chatTextInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSendTextMessage();
        });
    }

    /* Enregistreur de Messages Vocaux */
    let mediaRecorder = null;
    let audioChunks = [];
    let recordStartTime = 0;
    let recordInterval = null;

    if (voiceRecordBtn && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        voiceRecordBtn.addEventListener('click', async () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                // Arrêt et envoi
                mediaRecorder.stop();
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    clearInterval(recordInterval);
                    if (recordingStatusBar) recordingStatusBar.classList.remove('active');
                    if (voiceRecordBtn) voiceRecordBtn.classList.remove('recording');

                    const elapsed = Math.round((Date.now() - recordStartTime) / 1000);
                    const durStr = `0:${String(elapsed).padStart(2, '0')}`;

                    if (elapsed >= 1 && audioChunks.length > 0) {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        appendChatMessage('Moi', null, audioUrl, durStr, true);

                        // Simulation réponse vocale ou émission socket
                        if (socket && socket.connected) {
                            socket.emit('chat:send_voice', {
                                roomId: 'general-property',
                                audioData: audioUrl,
                                duration: durStr
                            });
                        }
                    }

                    stream.getTracks().forEach(t => t.stop());
                };

                mediaRecorder.start();
                recordStartTime = Date.now();
                if (voiceRecordBtn) voiceRecordBtn.classList.add('recording');
                if (recordingStatusBar) recordingStatusBar.classList.add('active');

                recordInterval = setInterval(() => {
                    const elapsed = Math.round((Date.now() - recordStartTime) / 1000);
                    if (voiceRecordTimer) voiceRecordTimer.textContent = `0:${String(elapsed).padStart(2, '0')}`;
                }, 1000);

            } catch (err) {
                showToast('Microphone non accessible ou permission refusée');
            }
        });
    }

    if (cancelVoiceRecordBtn) {
        cancelVoiceRecordBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                audioChunks = [];
                mediaRecorder.stop();
            }
        });
    }

    /* Simulation d'Appel Audio en Direct */
    const imoCallOverlay = document.getElementById('imoCallOverlay');
    const callContactName = document.getElementById('callContactName');
    const callPropertySub = document.getElementById('callPropertySub');
    const callStatusText = document.getElementById('callStatusText');
    const callAvatarInitial = document.getElementById('callAvatarInitial');
    const callMuteBtn = document.getElementById('callMuteBtn');
    const callEndBtn = document.getElementById('callEndBtn');

    let audioContext = null;
    let ringInterval = null;
    let callTimerInterval = null;

    function playRingtone() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            audioContext = new AudioCtx();

            const playPulse = () => {
                if (!audioContext) return;
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, audioContext.currentTime); // 440 Hz
                gain.gain.setValueAtTime(0.15, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.2);
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.start();
                osc.stop(audioContext.currentTime + 1.2);
            };

            playPulse();
            ringInterval = setInterval(playPulse, 2500);
        } catch (e) { }
    }

    function stopRingtone() {
        clearInterval(ringInterval);
        if (audioContext) {
            try { audioContext.close(); } catch (e) { }
            audioContext = null;
        }
    }

    function startAudioCall(contact = 'Cheikh Fall', sub = 'Imo-SN Prestige') {
        if (!imoCallOverlay) return;
        if (callContactName) callContactName.textContent = contact;
        if (callPropertySub) callPropertySub.textContent = sub;
        if (callAvatarInitial) callAvatarInitial.textContent = contact.split(' ').map(c => c[0]).join('').slice(0, 2);
        if (callStatusText) callStatusText.textContent = 'Sonnerie en cours...';

        imoCallOverlay.classList.add('active');
        playRingtone();

        // Après 3 secondes, l'appel est décroché
        setTimeout(() => {
            stopRingtone();
            if (callStatusText) callStatusText.textContent = 'Appel connecté • 00:00';
            let duration = 0;
            callTimerInterval = setInterval(() => {
                duration++;
                const m = String(Math.floor(duration / 60)).padStart(2, '0');
                const s = String(duration % 60).padStart(2, '0');
                if (callStatusText) callStatusText.textContent = `Connecté • ${m}:${s}`;
            }, 1000);
        }, 3200);
    }

    function endAudioCall() {
        stopRingtone();
        clearInterval(callTimerInterval);
        if (callStatusText) callStatusText.textContent = 'Appel terminé';
        setTimeout(() => {
            if (imoCallOverlay) imoCallOverlay.classList.remove('active');
        }, 800);
    }

    if (startCallFromChatBtn) {
        startCallFromChatBtn.addEventListener('click', () => {
            const partner = chatPartnerName ? chatPartnerName.textContent.split('(')[0].trim() : 'Cheikh Fall';
            startAudioCall(partner, 'Bailleur vérifié Imo-SN');
        });
    }

    if (callEndBtn) callEndBtn.addEventListener('click', endAudioCall);

    if (callMuteBtn) {
        callMuteBtn.addEventListener('click', () => {
            callMuteBtn.classList.toggle('muted');
            const isMuted = callMuteBtn.classList.contains('muted');
            callMuteBtn.innerHTML = `<i class="fas fa-microphone${isMuted ? '-slash' : ''}"></i>`;
            showToast(isMuted ? 'Microphone coupé' : 'Microphone réactivé');
        });
    }

    /* ==========================================================
       7. TOAST NOTIFICATION UTILITAIRE
       ========================================================== */
    function showToast(msg) {
        const toast = document.getElementById('toastNotification');
        const toastMsg = document.getElementById('toastMessage');
        if (!toast || !toastMsg) return;
        toastMsg.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    window.showToast = showToast;
});
