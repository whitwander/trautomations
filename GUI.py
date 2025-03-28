import ttkbootstrap, tkinter

from ttkbootstrap.constants import *

class GUIApp:
    def __init__(self, root):
        self.root = root
        self.root.resizable(False, False)
        self.root.geometry("360x350")
        self.root.title("Conferência de Processos")
        
        self.create_widgets()
    
    def create_widgets(self):
        frame = ttkbootstrap.Frame(self.root, padding=(5,5,5,5))
        frame.pack(fill="both", expand=True)
        
        label = ttkbootstrap.Label(frame, text="Selecione o Estado:", font=("Arial", 12))
        label.pack(pady=5)
        
        estados = ["es", "mg", "ce", "df"]
        combo = ttkbootstrap.Combobox(frame, values=estados, state="readonly")  # "readonly" evita entrada manual
        combo.pack(pady=5)
        combo.current(0)

        def selecionar():
            print("Estado selecionado:", combo.get())

        botao = ttkbootstrap.Button(frame, text="Confirmar", command=selecionar, bootstyle=PRIMARY)
        botao.pack(pady=10)

if __name__ == "__main__":
    root = ttkbootstrap.Window(themename="darkly")
    app = GUIApp(root)
    root.mainloop()