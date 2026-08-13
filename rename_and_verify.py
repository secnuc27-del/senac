import os
import re
import unicodedata

# 1. Renomeação das imagens
dir_path = os.path.join(os.path.dirname(__file__), 'fotos')
print("--- 1. PADRONIZANDO NOME DAS FOTOS ---")
print("Buscando fotos em:", dir_path)

if not os.path.exists(dir_path):
    print(f"Erro: A pasta '{dir_path}' não existe.")
    exit(1)

def clean_name(name):
    base, ext = os.path.splitext(name)
    # Decompõe acentos (NFD form)
    normalized = unicodedata.normalize('NFD', base)
    # Remove as marcas de acento
    stripped = "".join([c for c in normalized if not unicodedata.combining(c)])
    
    cleaned = stripped.lower()
    cleaned = cleaned.replace('ç', 'c')
    # Substitui qualquer sequência não alfanumérica por um único hífen
    cleaned = re.sub(r'[^a-z0-9]+', '-', cleaned)
    # Remove hífens extras no início ou final
    cleaned = cleaned.strip('-')
    
    return cleaned + ext.lower()

rename_count = 0
for file in os.listdir(dir_path):
    old_path = os.path.join(dir_path, file)
    if os.path.isdir(old_path):
        continue
    
    new_name = clean_name(file)
    new_path = os.path.join(dir_path, new_name)
    
    if file != new_name:
        print(f"Renomeando: '{file}' -> '{new_name}'")
        try:
            os.rename(old_path, new_path)
            rename_count += 1
        except Exception as e:
            print(f"Erro ao renomear {file}: {e}")
    else:
        print(f"Já padronizado: '{file}'")

print(f"Sucesso! {rename_count} arquivos renomeados.\n")

# 2. Verificação de referências
dia_html_path = os.path.join(os.path.dirname(__file__), 'dia.html')
print("--- 2. VERIFICANDO MAPEAMENTO EM DIA.HTML ---")
print("Lendo:", dia_html_path)

if not os.path.exists(dia_html_path):
    print(f"Erro: O arquivo '{dia_html_path}' não existe.")
    exit(1)

with open(dia_html_path, 'r', encoding='utf-8') as f:
    dia_html = f.read()

# Procura todas as ocorrências de P+'nome-do-arquivo'
matches = re.findall(r"P\+'([^']+)'", dia_html)
unique_matches = list(set(matches))
missing_count = 0

for file in unique_matches:
    file_path = os.path.join(dir_path, file)
    if not os.path.exists(file_path):
        print(f"  ❌ Arquivo ausente: '{file}'")
        missing_count += 1
    else:
        print(f"  ✓ Encontrado: '{file}'")

if missing_count == 0:
    print("\n🎉 Excelente! Todas as fotos mapeadas no código existem fisicamente na pasta 'fotos/'!")
else:
    print(f"\n⚠️ Atenção: Faltam {missing_count} fotos necessárias!")
