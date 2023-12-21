
import { NodeShaderMaterial, SimplexNoiseNode, attributes, clamp, float, lambertMaterial, mix, rgb, rgba, smoothstep, textureSampler2d, timeUniforms, transformed, translateX, uniforms, varyingAttributes, varyingFloat, vec2, vec4 } from "@hology/core/shader-nodes";
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { Color, Texture } from "three";

export class GrassShader extends NodeShader {
  @Parameter()
  color: Color

  @Parameter()
  color2: Color

  @Parameter()
  colorBottom: Color


  @Parameter()
  alphaMap: Texture

  output(): NodeShaderOutput {
    const distanceFromCamera = transformed.mvPosition.z().multiply(float(-1))
    const distanceAlpha = varyingFloat(smoothstep(float(100), float(60) , distanceFromCamera))
    
    const worldPosition = uniforms.instanceMatrix.multiplyVec(vec4(attributes.position, float(1)))

    const noiseAnimatedOffset = vec2(1,1).multiplyScalar(timeUniforms.elapsed.multiply(0.5))
    const noise = new SimplexNoiseNode(worldPosition.xz().add(noiseAnimatedOffset).multiplyScalar(0.2))
    
    const colorNoiseScale = 0.07
    const colorNoise = new SimplexNoiseNode(worldPosition.xz().multiplyScalar(colorNoiseScale))

    const tipColor1 = rgb(this.color ?? 0xffffff)
    const tipColor2 = rgb(this.color2 ?? 0xffffff)
    const tipColor = mix(tipColor1, tipColor2, varyingFloat(clamp(colorNoise, float(0), float(1))))

    const offsetFactor = 0.1
    
    const gradientColor = mix(
      tipColor,
      rgb(this.colorBottom ?? new Color(0x4A8B32).convertSRGBToLinear()),
      varyingAttributes.uv.y().add(0.2)
    )

    const alpha = this.alphaMap != null 
      ? textureSampler2d(this.alphaMap).sample(varyingAttributes.uv).r()
      : float(1)

    const lambertColor = lambertMaterial({color: gradientColor}).rgb()

    return {
      color: rgba(lambertColor, alpha.multiply(distanceAlpha)),
      transform: translateX(float(offsetFactor).multiply(noise).multiply(float(1).subtract(attributes.uv.y())))
    }
  }

  override build() {
    return new NodeShaderMaterial({
      transparent: false,
      alphaTest: 0.8,
      ...this.output()
    })
  }
}

export default GrassShader
