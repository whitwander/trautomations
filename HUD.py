import ttkbootstrap as ttk, tkinter as tk, pandas as pd
import subprocess, json, os, tempfile, threading
from tkinter import filedialog, messagebox

class GUIApp:
    def __init__(self, root):
        self.root, self.file_path = root, None
        self.root.geometry("400x300")
        self.root.title("Conferência de Processos")

        frame = ttk.Frame(self.root, padding=10)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="Selecione o Arquivo CSV ou Excel:").grid(row=0, column=0, padx=5, pady=5, sticky="w")
        self.txt_file_path = ttk.Entry(frame, width=40, state="readonly")
        self.txt_file_path.grid(row=1, column=0, padx=5, pady=5, sticky="ew")
        ttk.Button(frame, text="Selecionar Arquivo", bootstyle="warning", command=self.select_file_path).grid(row=1, column=1)
        ttk.Button(frame, text="Iniciar Conferência", bootstyle="success", command=self.start_conference).grid(row=2, column=1)

        self.console_output = tk.Text(frame, height=8, width=48, wrap=tk.WORD, state=tk.DISABLED)
        self.console_output.grid(row=3, column=0, columnspan=2, padx=5, pady=5)
        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=self.console_output.yview)
        scrollbar.grid(row=3, column=2, sticky="ns")
        self.console_output.config(yscrollcommand=scrollbar.set)
        frame.columnconfigure(0, weight=1)

    def select_file_path(self):
        if file_path := filedialog.askopenfilename(title='Selecionar Arquivo', filetypes=[("Excel", ["*.xlsx", "*.xls" "*.csv"])]):
            self.file_path = file_path
            self.txt_file_path.config(state="normal")
            self.txt_file_path.delete(0, tk.END)
            self.txt_file_path.insert(0, file_path)
            self.txt_file_path.config(state="readonly")

    def start_conference(self):
        if not self.file_path: return messagebox.showwarning("Aviso", "Nenhum arquivo selecionado!")
        threading.Thread(target=self.process_file).start()

    def process_file(self):
        try:
            df = pd.read_csv(self.file_path, dtype=str) if self.file_path.endswith(".csv") else pd.read_excel(self.file_path, dtype=str)
            if missing_columns := [col for col in ["NÚMERO", "TRIBUNAL/UF"] if col not in df.columns]:
                return messagebox.showerror("Erro", f"As colunas {missing_columns} não foram encontradas!")
            self.process_data = {estado: list(group["NÚMERO"].str.strip()) for estado, group in df.groupby("TRIBUNAL/UF")}
            self.run_js_script()
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao processar o arquivo:\n{e}")

    def run_js_script(self):
        try:
            with tempfile.NamedTemporaryFile(delete=False, mode="w", encoding="utf-8") as temp_file:
                temp_file.write(json.dumps(self.process_data))
                temp_file_path = temp_file.name
            
            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.js")
            process = subprocess.Popen(["node", script_path, temp_file_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            while (output := process.stdout.readline()):
                self.update_console(output.strip())

            if stderr := process.stderr.read():
                self.update_console(f"Erro: {stderr.strip()}")
            
            process.wait()
            os.remove(temp_file_path)
            messagebox.showinfo("Sucesso", "Processamento concluído com sucesso!")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao executar o script:\n{e}")

    def update_console(self, message):
        self.console_output.config(state=tk.NORMAL)
        self.console_output.insert(tk.END, message + "\n")
        self.console_output.config(state=tk.DISABLED)
        self.console_output.yview(tk.END)
        self.root.update_idletasks()

if __name__ == "__main__":
    app = GUIApp(ttk.Window(themename="darkly"))
    app.root.mainloop()
