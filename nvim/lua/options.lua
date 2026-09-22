-- Opciones generales: lectura comoda + arbol bonito
local opt = vim.opt

opt.number = true
opt.relativenumber = true
opt.cursorline = true
opt.termguicolors = true
opt.signcolumn = "yes"
opt.wrap = false
opt.scrolloff = 8
opt.sidescrolloff = 8

-- Tabs / indent
opt.expandtab = true
opt.shiftwidth = 2
opt.tabstop = 2
opt.smartindent = true

-- Busqueda
opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = false
opt.incsearch = true

-- Archivos
opt.swapfile = false
opt.backup = false
opt.undofile = true
opt.undodir = vim.fn.stdpath("data") .. "/undodir"

-- UI
opt.splitright = true
opt.splitbelow = true
opt.laststatus = 3 -- statusline global
opt.showmode = false -- lualine ya muestra el modo
opt.pumheight = 10
opt.conceallevel = 0
opt.fileencoding = "utf-8"

-- Mouse + clipboard (util al explorar)
opt.mouse = "a"
opt.clipboard = "unnamedplus"

-- Tiempos
opt.updatetime = 250
opt.timeoutlen = 400

-- Nerd Font: pon true si instalas una Nerd Font (recomendado)
vim.g.have_nerd_font = true
