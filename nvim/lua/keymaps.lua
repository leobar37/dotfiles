-- Atajos principales (Space = leader)
local map = vim.keymap.set
local opts = { noremap = true, silent = true }

-- Explorador de archivos
map("n", "<leader>e", "<cmd>Neotree toggle<cr>", vim.tbl_extend("force", opts, { desc = "Explorador archivos" }))
map("n", "<leader>o", "<cmd>Neotree focus<cr>", vim.tbl_extend("force", opts, { desc = "Foco en arbol" }))
map("n", "-", "<cmd>Oil<cr>", vim.tbl_extend("force", opts, { desc = "Abrir carpeta actual (oil)" }))

-- Telescope: buscar archivos
map("n", "<leader>ff", "<cmd>Telescope find_files<cr>", vim.tbl_extend("force", opts, { desc = "Buscar archivos" }))
map("n", "<leader>fg", "<cmd>Telescope live_grep<cr>", vim.tbl_extend("force", opts, { desc = "Buscar texto" }))
map("n", "<leader>fb", "<cmd>Telescope buffers<cr>", vim.tbl_extend("force", opts, { desc = "Buffers abiertos" }))
map("n", "<leader>fh", "<cmd>Telescope help_tags<cr>", vim.tbl_extend("force", opts, { desc = "Ayuda" }))
map("n", "<leader>fr", "<cmd>Telescope oldfiles<cr>", vim.tbl_extend("force", opts, { desc = "Recientes" }))

-- Buffers / ventanas
map("n", "<S-h>", "<cmd>BufferLineCyclePrev<cr>", opts)
map("n", "<S-l>", "<cmd>BufferLineCycleNext<cr>", opts)
map("n", "<leader>bd", "<cmd>bdelete<cr>", vim.tbl_extend("force", opts, { desc = "Cerrar buffer" }))
map("n", "<C-h>", "<C-w>h", opts)
map("n", "<C-j>", "<C-w>j", opts)
map("n", "<C-k>", "<C-w>k", opts)
map("n", "<C-l>", "<C-w>l", opts)

-- Utiles de vista
map("n", "<leader>z", "<cmd>ZenMode<cr>", vim.tbl_extend("force", opts, { desc = "Modo lectura zen" }))
map("n", "<leader>tw", "<cmd>set wrap!<cr>", vim.tbl_extend("force", opts, { desc = "Toggle wrap" }))
map("n", "<Esc>", "<cmd>nohlsearch<cr>", opts)

-- Salir / guardar rapido
map("n", "<leader>w", "<cmd>w<cr>", vim.tbl_extend("force", opts, { desc = "Guardar" }))
map("n", "<leader>q", "<cmd>q<cr>", vim.tbl_extend("force", opts, { desc = "Salir" }))
