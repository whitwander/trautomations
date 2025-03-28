import ttkbootstrap as ttk, tkinter as tk, pandas as pd
import subprocess, json, os

from tkinter import filedialog, messagebox
from datetime import datetime

class GUIApp:
    def __init__(self, root):
        self.root = root
        self.root.resizable(False, False)
        self.root.geometry("400x250")
        self.root.title("Conferência de Processos")

        self.file_path = None
        self.process_data = {}
        self.create_widgets()

    def create_widgets(self):
        frame = ttk.Frame(self.root, padding=10)
        frame.pack(fill="both", expand=True)

        label_info = ttk.Label(frame, text="Selecione o Arquivo CSV ou Excel:", font=("Arial", 12))
        label_info.grid(row=0, column=0, padx=5, pady=5, sticky="w")

        self.txt_file_path = ttk.Entry(frame, width=40, state="readonly")
        self.txt_file_path.grid(row=1, column=0, padx=5, pady=5, sticky="ew")

        btn_select = ttk.Button(frame, text="Selecionar Arquivo", bootstyle="warning", command=self.select_file_path)
        btn_select.grid(row=1, column=1, padx=5, pady=5)
        
        btn_init = ttk.Button(frame, text="Iniciar Conferência", bootstyle="success", command=self.start_conference)
        btn_init.grid(row=2, column=1, padx=5, pady=5)

        frame.columnconfigure(0, weight=1)

    def select_file_path(self):
        file_path = filedialog.askopenfilename(
            title='Selecionar Arquivo CSV ou Excel',
            filetypes=[("Arquivos Excel", "*.xlsx"), ("Arquivos CSV", "*.csv")]
        )

        if file_path:
            self.file_path = file_path
            self.txt_file_path.configure(state="normal")
            self.txt_file_path.delete(0, tk.END)
            self.txt_file_path.insert(0, file_path)
            self.txt_file_path.configure(state="readonly")

    def start_conference(self):
        if not self.file_path:
            messagebox.showwarning("Aviso", "Nenhum arquivo selecionado!")
            return

        try:
            if self.file_path.endswith(".csv"):
                df = pd.read_csv(self.file_path, dtype=str)
            elif self.file_path.endswith(".xlsx"):
                df = pd.read_excel(self.file_path, dtype=str)
            else:
                messagebox.showerror("Erro", "Formato de arquivo não suportado!")
                return

            required_columns = ["NÚMERO", "TRIBUNAL/UF"]
            missing_columns = [col for col in required_columns if col not in df.columns]

            if missing_columns:
                messagebox.showerror("Erro", f"As colunas {missing_columns} não foram encontradas no arquivo!")
                return

            self.process_data = {}
            for _, row in df.iterrows():
                estado = row["TRIBUNAL/UF"].strip()
                numero_processo = row["NÚMERO"].strip()

                if estado in self.process_data:
                    self.process_data[estado].append(numero_processo)
                else:
                    self.process_data[estado] = [numero_processo]

            self.save_json()

        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao processar o arquivo:\n{e}")

    def save_json(self):
        if not self.process_data:
            messagebox.showwarning("Aviso", "Nenhum dado para salvar!")
            return

        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        filename = f"dados_processos_{date_str}.json"

        try:
            script_directory = os.path.dirname(os.path.abspath(__file__))
            save_path = os.path.join(script_directory, filename)

            with open(save_path, "w", encoding="utf-8") as json_file:
                json.dump(self.process_data, json_file, indent=4, ensure_ascii=False)

        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao salvar JSON:\n{e}")

        self.run_js_script(filename)

    def run_js_script(self, filename):
        try:
            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.js")
            subprocess.run(["node", script_path, filename], check=True)
        except subprocess.CalledProcessError as e:
            messagebox.showerror("Erro", f"Erro ao executar o script JS:\n{e}")

if __name__ == "__main__":
    root = ttk.Window(themename="darkly")
    app = GUIApp(root)
    root.mainloop()
