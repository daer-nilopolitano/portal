// Lista estática dos links do Google Drive — atualizar aqui direto quando
// os links mudarem (decisão registrada: não vale a complexidade de um
// backend pra isso agora).

export interface CategoriaMaterial {
  categoria: string;
  url: string;
}

export const MATERIAIS: CategoriaMaterial[] = [
  { categoria: "Logos", url: "https://drive.google.com/drive/folders/18PzKDQUIpIW6ndZZpP6WiFznBVosB39D?usp=sharing" },
  { categoria: "Músicas", url: "https://drive.google.com/drive/folders/1GyvVRNQkifvQyjNpjPg0qz-O-JCCL_Qy?usp=sharing" },
  { categoria: "Provas", url: "https://drive.google.com/drive/folders/1LxIlHxXD44-1974ESdbUtJAQFzAqmxoE?usp=sharing" },
  { categoria: "Modelos de documentos", url: "https://drive.google.com/drive/folders/1Tve4r1wMkUkJTXdCO2ZBmy2ExprL7pn4?usp=sharing" },
  { categoria: "Curso de conselheiros", url: "https://drive.google.com/drive/folders/1X9e3gp8br_Bw8zSb8lHoBHCa8hmqqyaf?usp=sharing" },
  { categoria: "Manuais", url: "https://drive.google.com/drive/folders/1Zdo4mNuFD6qAtuRfYwUiVIjzIIhkVc-s?usp=sharing" },
  { categoria: "Material de estudo", url: "https://drive.google.com/drive/folders/1_dJUPDka3NxENxZiR17OK4Jc0OkHKH36?usp=sharing" },
  { categoria: "Livros", url: "https://drive.google.com/drive/folders/1hVYONFWpivCSLPZWyi_gGOHwcEpTEZEQ?usp=sharing" },
  { categoria: "Questionários", url: "https://drive.google.com/drive/folders/1peZd6OQBCi9mvmZxhCg9HCeoKSzXVjjp?usp=sharing" },
  { categoria: "Fotos dos eventos", url: "https://drive.google.com/drive/folders/1zw2GYgyykAaYYoN4pkDuKWGMhNPPhhm_?usp=sharing" },
];
