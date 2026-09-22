-- Bootstrap de lazy.nvim (gestor de plugins)
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.uv.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable",
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  -- Tema bonito
  {
    "folke/tokyonight.nvim",
    lazy = false,
    priority = 1000,
    opts = { style = "night" },
    config = function(_, opts)
      require("tokyonight").setup(opts)
      vim.cmd.colorscheme("tokyonight-night")
    end,
  },

  -- Iconos
  { "nvim-tree/nvim-web-devicons", lazy = true },

  -- Statusline bonita
  {
    "nvim-lualine/lualine.nvim",
    event = "VeryLazy",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    opts = {
      options = { theme = "tokyonight", globalstatus = true },
    },
  },

  -- Tabs superiores
  {
    "akinsho/bufferline.nvim",
    event = "VeryLazy",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    opts = {},
  },

  -- Arbol de archivos (lateral)
  {
    "nvim-neo-tree/neo-tree.nvim",
    branch = "v3.x",
    dependencies = {
      "nvim-lua/plenary.nvim",
      "nvim-tree/nvim-web-devicons",
      "MunifTanjim/nui.nvim",
    },
    cmd = "Neotree",
    keys = {
      { "<leader>e", "<cmd>Neotree toggle<cr>", desc = "Explorador archivos" },
    },
    opts = {
      close_if_last_window = true,
      window = { width = 32 },
      filesystem = {
        follow_current_file = { enabled = true },
        hijack_netrw_behavior = "open_current",
        filtered_items = { visible = true, hide_dotfiles = false },
      },
    },
  },

  -- Ver carpeta como buffer editable (ideal para explorar rapido)
  {
    "stevearc/oil.nvim",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    cmd = "Oil",
    keys = { { "-", "<cmd>Oil<cr>", desc = "Abrir carpeta (oil)" } },
    opts = { view_options = { show_hidden = true } },
  },

  -- Buscador difuso
  {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    dependencies = { "nvim-lua/plenary.nvim" },
    opts = {
      defaults = {
        layout_strategy = "horizontal",
        sorting_strategy = "ascending",
        layout_config = { prompt_position = "top" },
      },
    },
  },

  -- Resaltado de sintaxis (API nueva, rama main)
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    build = ":TSUpdate",
    event = { "BufReadPost", "BufNewFile" },
    config = function()
      local ts = require("nvim-treesitter")
      ts.setup()
      -- Instala parsers en segundo plano (no-op si ya estan)
      ts.install({
        "lua", "vim", "vimdoc", "bash",
        "javascript", "typescript", "tsx", "json",
        "html", "css", "markdown", "markdown_inline",
        "python", "rust", "go", "yaml", "toml",
      })
      -- Activa resaltado + indent donde haya parser disponible
      vim.api.nvim_create_autocmd("FileType", {
        callback = function(args)
          if pcall(vim.treesitter.start, args.buf) then
            vim.bo[args.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
          end
        end,
      })
    end,
  },

  -- Lineas de indentacion sutiles
  {
    "lukas-reineke/indent-blankline.nvim",
    main = "ibl",
    event = { "BufReadPost", "BufNewFile" },
    opts = {},
  },

  -- Marcas de git en el gutter
  {
    "lewis6991/gitsigns.nvim",
    event = { "BufReadPost", "BufNewFile" },
    opts = {},
  },

  -- Ayuda visual de atajos
  {
    "folke/which-key.nvim",
    event = "VeryLazy",
    opts = {},
  },

  -- Modo lectura sin distracciones
  {
    "folke/zen-mode.nvim",
    cmd = "ZenMode",
    opts = { window = { width = 100 } },
  },
}, {
  checker = { enabled = false }, -- no auto-check en local
})
