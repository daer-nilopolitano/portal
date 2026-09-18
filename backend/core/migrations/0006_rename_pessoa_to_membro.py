# Renomeia Pessoa -> Membro em todo o schema, incluindo os campos que
# apontavam para ela (Papel.pessoa -> Papel.membro, Carteirinha.pessoa ->
# Carteirinha.membro) e os related_names que continham a palavra "pessoa"
# (Embaixada.membros, User.membro).
#
# Nota: o upload_to de Membro.foto muda de 'pessoas/fotos/' para
# 'membros/fotos/', mas isso só afeta uploads NOVOS — arquivos já enviados
# continuam funcionando normalmente, pois o caminho já salvo no banco não
# depende do upload_to atual.

from django.conf import settings
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_remove_embaixada_dia_semana_reuniao_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Pessoa',
            new_name='Membro',
        ),
        migrations.AlterModelOptions(
            name='membro',
            options={'ordering': ['nome'], 'verbose_name': 'Membro', 'verbose_name_plural': 'Membros'},
        ),
        migrations.RenameField(
            model_name='papel',
            old_name='pessoa',
            new_name='membro',
        ),
        migrations.AlterField(
            model_name='papel',
            name='membro',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='papeis', to='core.membro'),
        ),
        migrations.RenameField(
            model_name='carteirinha',
            old_name='pessoa',
            new_name='membro',
        ),
        migrations.AlterField(
            model_name='carteirinha',
            name='membro',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='carteirinha', to='core.membro'),
        ),
        migrations.AlterField(
            model_name='membro',
            name='embaixada',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='membros', to='core.embaixada'),
        ),
        migrations.AlterField(
            model_name='membro',
            name='foto',
            field=models.ImageField(blank=True, null=True, upload_to='membros/fotos/'),
        ),
        migrations.AlterField(
            model_name='membro',
            name='user',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='membro', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='embaixada',
            name='conselheiro_responsavel',
            field=models.ForeignKey(blank=True, help_text="Deve ser um Membro com Papel do tipo 'conselheiro'. É quem cadastra embaixadores e auxiliares desta embaixada.", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='embaixadas_lideradas', to='core.membro'),
        ),
        migrations.AlterField(
            model_name='embaixada',
            name='conselheiros',
            field=models.ManyToManyField(blank=True, help_text='Demais conselheiros desta embaixada, além do responsável acima.', related_name='embaixadas_como_conselheiro', to='core.membro'),
        ),
    ]
