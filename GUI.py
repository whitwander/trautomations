import ttkbootstrap as ttk, tkinter as tk, pandas as pd, subprocess, json, os, tempfile
from tkinter import filedialog, messagebox

class GUIApp:
    def __init__(self, root):
        self.root, self.file_path, self.process_data = root, None, {}
        self.root.resizable(False, False)
        self.root.geometry("400x250")
        self.root.title("Conferência de Processos")
        self.create_widgets()

    def create_widgets(self):
        frame = ttk.Frame(self.root, padding=10)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="Selecione o Arquivo CSV ou Excel:", font=("Arial", 12)).grid(row=0, column=0, padx=5, pady=5, sticky="w")
        self.txt_file_path = ttk.Entry(frame, width=40, state="readonly")
        self.txt_file_path.grid(row=1, column=0, padx=5, pady=5, sticky="ew")
        ttk.Button(frame, text="Selecionar Arquivo", bootstyle="warning", command=self.select_file_path).grid(row=1, column=1, padx=5, pady=5)
        ttk.Button(frame, text="Iniciar Conferência", bootstyle="success", command=self.start_conference).grid(row=2, column=1, padx=5, pady=5)
        frame.columnconfigure(0, weight=1)

    def select_file_path(self):
        if file_path := filedialog.askopenfilename(title='Selecionar Arquivo CSV ou Excel', filetypes=[("Arquivos Excel", "*.xlsx"), ("Arquivos CSV", "*.csv")]):
            self.file_path = file_path
            self.txt_file_path.configure(state="normal")
            self.txt_file_path.delete(0, tk.END)
            self.txt_file_path.insert(0, file_path)
            self.txt_file_path.configure(state="readonly")

    def start_conference(self):
        if not self.file_path:
            return messagebox.showwarning("Aviso", "Nenhum arquivo selecionado!")
        try:
            df = pd.read_csv(self.file_path, dtype=str) if self.file_path.endswith(".csv") else pd.read_excel(self.file_path, dtype=str)
            if missing_columns := [col for col in ["NÚMERO", "TRIBUNAL/UF"] if col not in df.columns]:
                return messagebox.showerror("Erro", f"As colunas {missing_columns} não foram encontradas no arquivo!")
            self.process_data = {estado: list(group["NÚMERO"].str.strip()) for estado, group in df.groupby("TRIBUNAL/UF")}
            self.run_js_script()
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao processar o arquivo:\n{e}")

    def run_js_script(self):
        try:
            with tempfile.NamedTemporaryFile(delete=False, mode="w", encoding="utf-8") as temp_file:
                temp_file.write(json.dumps(self.process_data))
                temp_file_path = temp_file.name
            
            script_directory = os.path.dirname(os.path.abspath(__file__))
            script_path = os.path.join(script_directory, "main.js")

            subprocess.run(["node", script_path, temp_file_path], check=True)
            os.remove(temp_file_path)

        except subprocess.CalledProcessError as e:
            messagebox.showerror("Erro", f"Erro ao executar o script JS:\n{e}")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao criar o arquivo temporário:\n{e}")

if __name__ == "__main__":
    app = GUIApp(ttk.Window(themename="darkly"))
    app.root.mainloop()
