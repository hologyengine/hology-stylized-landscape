
import { NodeShaderMaterial, RgbNode, attributes, float, lambertMaterial, mix, pow, rgb, rgba, smoothstep, standardMaterial, textureSampler2d, transformed, varyingAttributes, varyingFloat, vec3 } from "@hology/core/shader-nodes";
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { Color, DoubleSide, Texture } from "three";

export class GrassShader extends NodeShader {
  @Parameter()
  color: Color

  @Parameter()
  colorBottom: Color


  @Parameter()
  alphaMap: Texture

  output(): NodeShaderOutput {
    const distanceFromCamera = transformed.mvPosition.z().multiply(float(-1))
    //const distanceAlpha = varyingFloat(select(distanceFromCamera.lt(float(100)), float(1), float(0)))
    // Use this approach to fade it away
    const distanceAlpha = varyingFloat(smoothstep(float(100), float(60) , distanceFromCamera))

    
    const gradientColor = mix(
      rgb(this.color ?? 0xffffff),
      rgb(this.colorBottom ?? new Color(0x4A8B32).convertSRGBToLinear()),
      //attributes.uv.y(),
      // For some reason I have to give a varying value to lambert
      varyingAttributes.uv.y().add(0.2)
    )

    // TODO Must be a way to have required parameters to avoid runtime errors
    const alpha = this.alphaMap != null 
      ? textureSampler2d(this.alphaMap).sample(varyingAttributes.uv).r()
      : float(1)

    // Standard material works on my PC but not a big visual difference
    const lambertColor = standardMaterial({color: gradientColor}).rgb()

    // Calculate lambert color before applying the alpha so that
    // light calculation can happen in the vertex shader 
      
    rgb(0xffffff)
    return {
      color: rgba(lambertColor, alpha.multiply(distanceAlpha)),
      //transparent: true,
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
