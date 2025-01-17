import pandas as pd
import json

# Загрузите данные из Excel файла
df = pd.read_excel('Обладнання Andrioti.xlsx')

# Удалите лишние пробелы из названий столбцов
df.columns = df.columns.str.strip()
# Удалите символы новой строки
df = df.replace({r'\n': ' '}, regex=True)
# Преобразуйте значения с плавающей запятой в целые числа, если это возможно
for col in ['№ *', 'Лінія', 'Потужність кВт']:
    df[col] = df[col].apply(lambda x: int(x) if pd.notna(x) and isinstance(x, float) and x.is_integer() else x)

# Функция для конвертации float -> int в JSON
def convert_floats_to_ints(data):
    if isinstance(data, list):
        return [convert_floats_to_ints(item) for item in data]
    elif isinstance(data, dict):
        return {key: convert_floats_to_ints(value) for key, value in data.items()}
    elif isinstance(data, float) and data.is_integer():
        return int(data)
    return data

# Создайте список для хранения результатов
results = []
current_equipment_code = None

# Переберите строки DataFrame
for index, row in df.iterrows():
    # Если в строке есть значение Код обладнання, создаем новый элемент
    if pd.notna(row['Код обладнання']):
        # Завершаем обработку текущего элемента, если он есть
        current_equipment_code = row['Код обладнання']
        results.append({
            "№*": row['№ *'] if pd.notna(row['№ *']) else '-',
            "Цех": row['Цех'] if pd.notna(row['Цех']) else '-',
            "Лінія": row['Лінія'] if pd.notna(row['Лінія']) else '-',
            "Код обладнання": current_equipment_code,
            "Назва обладнання (українською)": row['Назва обладнання (українською)'] if pd.notna(row['Назва обладнання (українською)']) else '-',
            "ЕМ/КВПіА": []
        })

    # Если в строке есть значение EM, создаем новый элемент EM
    if pd.notna(row['EM']):
        em_data = {
            "ЕМ": row['EM'] if pd.notna(row['EM']) else '-',
            "Потужність Квт": row['Потужність кВт'] if pd.notna(row['Потужність кВт']) else '-',
            "Сила струму": row['Сила струму'] if pd.notna(row['Сила струму']) else '-',
            "Номер Автомата": row['Номер автомата'] if pd.notna(row['Номер автомата']) else '-',
            "Пристрій пуску": row['Пристрій пуску'] if pd.notna(row['Пристрій пуску']) else '-',
            "Номер шафи EM": row['Номер шафи EM'] if pd.notna(row['Номер шафи EM']) else '-',
            "Відмітка EM": row['Відмітка EM'] if pd.notna(row['Відмітка EM']) else '-',
            "Підшипники": {
                "Передній": row['Підшипник Передній'] if pd.notna(row['Підшипник Передній']) else '-',
                "Задній": row['Підшипник Задній'] if pd.notna(row['Підшипник Задній']) else '-'
            },
            "Квадрат ЕМ": row['Квадрат EM'] if pd.notna(row['Квадрат EM']) else '-',
            "Посилання ЕМ": row['Посилання EM'] if pd.notna(row['Посилання EM']) else '-',
            "КВПіА": []
        }
        results[-1]["ЕМ/КВПіА"].append(em_data)

    # Если строка содержит данные КВПіА, добавляем их
    if pd.notna(row.get('Назва датчика', None)):
        kvpia_data = {
            "Назва датчика": row.get('Назва датчика', '-') if pd.notna(row.get('Назва датчика', None)) else '-',
            "Номер сигналу": row.get('Номер сигналу', '-') if pd.notna(row.get('Номер сигналу', None)) else '-',
            "Модель датчика": row.get('Модель датчика', '-') if pd.notna(row.get('Модель датчика', None)) else '-',
            "Номер шафи КВПіА": row.get('Номер шафи КВПіА', '-') if pd.notna(row.get('Номер шафи КВПіА', None)) else '-',
            "Відмітка КВПіА": row.get('Відмітка КВПіА', '-') if pd.notna(row.get('Відмітка КВПіА', None)) else '-',
            "Квадрат КВПіА": row.get('Квадрат КВПіА', '-') if pd.notna(row.get('Квадрат КВПіА', None)) else '-',
            "Посилання КВПіА": row.get('Посилання КВПіА', '-') if pd.notna(row.get('Посилання КВПіА', None)) else '-'
        }

        # Если нет EM, создаем элемент для КВПіА
        if not results[-1]["ЕМ/КВПіА"]:
            results[-1]["ЕМ/КВПіА"].append({"КВПіА": [kvpia_data]})
        else:
            results[-1]["ЕМ/КВПіА"][-1]["КВПіА"].append(kvpia_data)

# Преобразуйте данные перед сериализацией
results = convert_floats_to_ints(results)

# Сохранение в JSON
with open('output.json', 'w', encoding='utf-8') as json_file:
    json.dump(results, json_file, ensure_ascii=False, indent=4)
