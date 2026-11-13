
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================

const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
const SUPABASE_KEY = 'SUA_CHAVE_PUBLICA';

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==========================================
// ELEMENTOS HTML
// ==========================================

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const usernameInput = document.getElementById('username');
const copyLinkBtn = document.getElementById('copy-link-btn');
const newRoomBtn = document.getElementById('new-room-btn');

const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');

// ==========================================
// VARIÁVEIS
// ==========================================

let myName = 'Anônimo_' + Math.floor(100 + Math.random() * 900);

let roomCode = window.location.hash
    .replace('#', '')
    .toUpperCase();

let loadedMessages = new Set();
let sending = false;
let pollingInterval = null;

usernameInput.value = myName;

// ==========================================
// ATUALIZAR APELIDO
// ==========================================

usernameInput.addEventListener('input', () => {

    myName = usernameInput.value.trim().slice(0, 20) || 'Anônimo';

});

// ==========================================
// ADICIONAR MENSAGENS NA TELA
// ==========================================

function addMessage(sender, text, type = 'other', id = null) {

    if (id !== null) {

        if (loadedMessages.has(String(id))) {
            return;
        }

        loadedMessages.add(String(id));

    }

    const div = document.createElement('div');

    div.classList.add('msg');

    if (type === 'system') {

        div.classList.add('msg-system');
        div.textContent = text;

    } else {

        div.classList.add(
            type === 'me' ? 'msg-me' : 'msg-other'
        );

        const senderDiv = document.createElement('div');

        senderDiv.classList.add('msg-sender');
        senderDiv.textContent = sender;

        const textDiv = document.createElement('div');

        textDiv.textContent = text;

        div.appendChild(senderDiv);
        div.appendChild(textDiv);

    }

    messagesDiv.appendChild(div);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;

}

// ==========================================
// CRIAR NOVA SALA
// ==========================================

async function createRoom() {

    const { data, error } = await supabase.rpc('create_room');

    if (error) {
        throw error;
    }

    return data;

}

// ==========================================
// CARREGAR MENSAGENS
// ==========================================

async function loadMessages() {

    const { data, error } = await supabase.rpc('get_messages', {

        p_code: roomCode

    });

    if (error) {
        throw error;
    }

    // A função SQL retorna as mensagens mais recentes primeiro.
    // Aqui colocamos na ordem correta.

    data.reverse();

    data.forEach(message => {

        const type = message.sender === myName ? 'me' : 'other';

        addMessage(
            message.sender,
            message.content,
            type,
            message.id
        );

    });

}

// ==========================================
// ATUALIZAR MENSAGENS
// ==========================================

async function updateMessages() {

    try {

        await loadMessages();

    } catch (error) {

        console.error('Erro ao atualizar mensagens:', error);

    }

}

// ==========================================
// ENVIAR MENSAGEM
// ==========================================

async function sendMessage() {

    const text = msgInput.value.trim();

    if (!text || sending) {
        return;
    }

    if (text.length > 2000) {
        alert('A mensagem é muito grande.');
        return;
    }

    sending = true;
    sendBtn.disabled = true;

    try {

        const { error } = await supabase.rpc('send_message', {

            p_code: roomCode,
            p_sender: myName,
            p_content: text

        });

        if (error) {
            throw error;
        }

        msgInput.value = '';

        await updateMessages();

    } catch (error) {

        console.error('Erro ao enviar mensagem:', error);

        alert('Não foi possível enviar a mensagem.');

    } finally {

        sending = false;
        sendBtn.disabled = false;

    }

}

// ==========================================
// INICIAR SALA
// ==========================================

async function initRoom() {

    try {

        // Se não existir código na URL, cria uma sala.

        if (!roomCode) {

            roomCode = await createRoom();

            window.location.hash = roomCode;

        }

        // Carrega as mensagens da sala.

        await loadMessages();

        statusDot.className = 'dot online';

        statusText.textContent = `Sala: ${roomCode} (Online)`;

        addMessage(
            '',
            'Você entrou na sala! Compartilhe o link para conversar.',
            'system'
        );

        // Atualiza as mensagens periodicamente.

        pollingInterval = setInterval(() => {

            updateMessages();

        }, 1500);

    } catch (error) {

        console.error('Erro ao iniciar sala:', error);

        statusDot.className = 'dot offline';

        statusText.textContent = 'Erro ao conectar';

        addMessage(
            '',
            'Não foi possível acessar esta sala. Verifique o código ou a conexão.',
            'system'
        );

    }

}

// ==========================================
// BOTÃO ENVIAR
// ==========================================

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keydown', event => {

    if (event.key === 'Enter') {

        sendMessage();

    }

});

// ==========================================
// COPIAR LINK DA SALA
// ==========================================

copyLinkBtn.addEventListener('click', async () => {

    try {

        await navigator.clipboard.writeText(window.location.href);

        copyLinkBtn.textContent = 'Link Copiado!';

        setTimeout(() => {

            copyLinkBtn.textContent = 'Copiar Link da Sala';

        }, 2000);

    } catch (error) {

        console.error(error);

        alert('Não foi possível copiar o link.');

    }

});

// ==========================================
// CRIAR OUTRA SALA
// ==========================================

newRoomBtn.addEventListener('click', async () => {

    try {

        newRoomBtn.disabled = true;

        const newCode = await createRoom();

        window.location.hash = newCode;

        window.location.reload();

    } catch (error) {

        console.error('Erro ao criar sala:', error);

        alert('Não foi possível criar uma nova sala.');

        newRoomBtn.disabled = false;

    }

});

// ==========================================
// INICIAR PROJETO
// ==========================================

initRoom();
