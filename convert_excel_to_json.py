import pandas as pd
import json
import os

def convert_excel_to_json(excel_file):
    # 读取Excel文件
    df = pd.read_excel(excel_file)
    
    # 将DataFrame转换为字典列表
    data = df.to_dict(orient='records')
    
    # 生成输出文件名
    output_file = os.path.splitext(excel_file)[0] + '.json'
    
    # 将数据写入JSON文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f'已将 {excel_file} 转换为 {output_file}')

def main():
    # 获取data目录下的所有Excel文件
    data_dir = 'data'
    excel_files = [f for f in os.listdir(data_dir) if f.endswith('.xlsx')]
    
    # 转换每个Excel文件
    for excel_file in excel_files:
        file_path = os.path.join(data_dir, excel_file)
        convert_excel_to_json(file_path)

if __name__ == '__main__':
    main() 