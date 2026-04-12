import os
import re

base_dir = r"C:\\Users\\barca2\.gemini\antigravity\playground\drifting-magnetosphere\pulpos_clone\app\(dashboard)\preferencias"

for root, dirs, files in os.walk(base_dir):
    for filename in files:
        if filename == "page.tsx":
            filepath = os.path.join(root, filename)
            
            # Skip custom pages
            if any(exclude in filepath for exclude in ['usuarios', 'general', 'sucursales']):
                continue
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Only process those importing updateAdvancedConfig
            if "updateAdvancedConfig" not in content:
                continue

            # Extract module key
            module_match = re.search(r"\]\['(.*?)'\]", content)
            if not module_match:
                module_match = re.search(r"updateAdvancedConfig\('(.*?)'", content)
            if not module_match:
                continue
                
            module_key = module_match.group(1)

            # Extract title and description
            title_match = re.search(r"<h2[^>]*>(.*?)</h2>", content, re.DOTALL)
            title = title_match.group(1).strip() if title_match else "Configuración"
            title = re.sub(r'<[^>]+>', '', title).strip() # clean icons

            desc_match = re.search(r"<p[^>]*>(.*?)</p>", content, re.DOTALL)
            desc = desc_match.group(1).strip() if desc_match else ""

            # Extract inputs
            inputs = []
            block_pattern = re.compile(r"<label[^>]*>(.*?)</label>\s*<input[^>]*name=[\"'](.*?)[\"'][^>]*placeholder=[\"'](.*?)[\"'][^>]*>", re.DOTALL)
            for m in block_pattern.finditer(content):
                label = m.group(1).strip()
                name = m.group(2)
                placeholder = m.group(3)
                
                # Check input type if possible
                inputType = "text"
                if re.search(f'name=[\"\']{name}[\"\'][^>]*type=[\"\']number[\"\']', content):
                    inputType = "number"
                    
                inputs.append(f"{{ name: '{name}', label: '{label}', type: '{inputType}', placeholder: '{placeholder}' }}")

            if not inputs:
                # try alternative input pattern
                alt_pattern = re.compile(r"<label[^>]*>(.*?)</label>\s*<input[^>]*type=[\"'](.*?)[\"'][^>]*name=[\"'](.*?)[\"']", re.DOTALL)
                for m in alt_pattern.finditer(content):
                    label = m.group(1).strip()
                    inputType = m.group(2)
                    name = m.group(3)
                    placeholder = ""
                    # try to extract placeholder
                    ph_match = re.search(f'name=[\"\']{name}[\"\'][^>]*placeholder=[\"\'](.*?)[\"\']', content)
                    if ph_match:
                        placeholder = ph_match.group(1)
                    inputs.append(f"{{ name: '{name}', label: '{label}', type: '{inputType}', placeholder: '{placeholder}' }}")

            inputs_str = ",\n        ".join(inputs)

            new_content = f"""import {{ getBranchSettings }} from "@/app/actions/settings";
import SettingsFormClient from "../SettingsFormClient";

export default async function Page() {{
  const settings = await getBranchSettings();
  const config = settings.configJson ? JSON.parse(settings.configJson)['{module_key}'] || {{}} : {{}};

  return (
    <SettingsFormClient 
      moduleKey="{module_key}"
      title="{title}"
      description="{desc}"
      initialConfig={{config}}
      fields={{[
        {inputs_str}
      ]}}
    />
  );
}}
"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
                print(f"Patched {filepath}")
