# Fase 2, passo 1 de 3 — só adiciona schema novo, nada é removido ainda.
# Membro.tipo/posto_embaixador nascem nullable de propósito: só viram
# obrigatórios na migração 0009, depois que 0008 tiver copiado os dados de
# Papel pra dentro deles. Papel continua existindo até 0009.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_rename_pessoa_to_membro'),
    ]

    operations = [
        migrations.AddField(
            model_name='membro',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('conselheiro', 'Conselheiro'),
                    ('auxiliar', 'Auxiliar'),
                    ('embaixador_do_rei', 'Embaixador do Rei'),
                ],
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='membro',
            name='posto_embaixador',
            field=models.CharField(
                blank=True,
                choices=[
                    ('escudeiro', 'Embaixador Escudeiro'),
                    ('arauto', 'Embaixador Arauto'),
                    ('senior', 'Embaixador Sênior'),
                    ('emerito', 'Embaixador Emérito'),
                ],
                help_text='Preencher apenas quando tipo = Embaixador do Rei.',
                max_length=20,
                null=True,
                verbose_name='Posto',
            ),
        ),
        migrations.CreateModel(
            name='GrupoTrabalho',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100, unique=True)),
            ],
            options={
                'verbose_name': 'Grupo de Trabalho',
                'verbose_name_plural': 'Grupos de Trabalho',
                'ordering': ['nome'],
            },
        ),
        migrations.CreateModel(
            name='Diretoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cargo', models.CharField(choices=[
                    ('coordenador', 'Coordenador'),
                    ('presidente', 'Presidente'),
                    ('vice_presidente', 'Vice-Presidente'),
                    ('primeiro_secretario', '1º Secretário'),
                    ('segundo_secretario', '2º Secretário'),
                    ('diretor_midia_comunicacao', 'Diretor de Mídia e Comunicação'),
                    ('diretor_esportes', 'Diretor de Esportes'),
                ], max_length=40)),
                ('data_inicio', models.DateField()),
                ('data_fim', models.DateField(blank=True, null=True)),
                ('membro', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mandatos_diretoria', to='core.membro')),
            ],
            options={
                'verbose_name': 'Diretoria',
                'verbose_name_plural': 'Diretoria',
                'ordering': ['-data_inicio'],
            },
        ),
        migrations.AddConstraint(
            model_name='diretoria',
            constraint=models.UniqueConstraint(condition=models.Q(('data_fim__isnull', True)), fields=('membro',), name='unico_mandato_ativo_por_membro'),
        ),
        migrations.CreateModel(
            name='GrupoMembro',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('papel_no_grupo', models.CharField(choices=[('lider', 'Líder'), ('membro', 'Membro')], max_length=10)),
                ('grupo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participantes', to='core.grupotrabalho')),
                ('membro', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='grupos_trabalho', to='core.membro')),
            ],
            options={
                'verbose_name': 'Participante de Grupo de Trabalho',
                'verbose_name_plural': 'Participantes de Grupos de Trabalho',
                'ordering': ['grupo', 'papel_no_grupo', 'membro__nome'],
            },
        ),
        migrations.AddConstraint(
            model_name='grupomembro',
            constraint=models.UniqueConstraint(fields=('grupo', 'membro'), name='unico_membro_por_grupo'),
        ),
        migrations.AddConstraint(
            model_name='grupomembro',
            constraint=models.UniqueConstraint(condition=models.Q(('papel_no_grupo', 'lider')), fields=('membro',), name='unico_grupo_liderado_por_membro'),
        ),
        migrations.CreateModel(
            name='DiretoriaEmbaixada',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cargo', models.CharField(choices=[
                    ('embaixador_chefe', 'Embaixador Chefe'),
                    ('embaixador_assistente', 'Embaixador Assistente'),
                    ('secretario', 'Secretário'),
                    ('intendente', 'Intendente'),
                    ('porta_voz', 'Porta-voz'),
                    ('consul', 'Cônsul'),
                    ('tesoureiro', 'Tesoureiro'),
                    ('diretor_musica', 'Diretor de Música'),
                    ('diretor_esportes', 'Diretor de Esportes'),
                ], max_length=30)),
                ('data_inicio', models.DateField()),
                ('embaixada', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quadro_oficiais', to='core.embaixada')),
                ('membro', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cargos_embaixada', to='core.membro')),
            ],
            options={
                'verbose_name': 'Diretoria da Embaixada',
                'verbose_name_plural': 'Diretorias das Embaixadas',
                'ordering': ['embaixada', 'cargo'],
            },
        ),
        migrations.AddConstraint(
            model_name='diretoriaembaixada',
            constraint=models.UniqueConstraint(fields=('embaixada', 'cargo'), name='unico_titular_por_cargo'),
        ),
    ]
